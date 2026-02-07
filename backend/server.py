from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, Response, Request
from fastapi.responses import FileResponse
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timedelta
from pathlib import Path
import bcrypt
import os
import secrets
import shutil
import logging
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME')

UPLOADS_DIR = ROOT_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)

app = FastAPI()
api_router = APIRouter(prefix="/api")

SESSION_SECRET = os.environ.get('SESSION_SECRET', secrets.token_hex(32))

db_client = None
db = None

class UserCreate(BaseModel):
    username: str
    password: str
    full_name: str
    role: str
    session_duration_hours: int = 8

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    session_duration_hours: Optional[int] = None
    password: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    username: str
    full_name: str
    role: str
    session_duration_hours: int
    is_first_login: bool
    created_at: str

class LoginRequest(BaseModel):
    username: str
    password: str

class PasswordChangeRequest(BaseModel):
    new_password: str

class PatientCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    date_of_birth: Optional[str] = None
    address: Optional[str] = None
    medical_history: Optional[str] = None
    notes: Optional[str] = None

class PatientUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    date_of_birth: Optional[str] = None
    address: Optional[str] = None
    medical_history: Optional[str] = None
    notes: Optional[str] = None

class PatientResponse(BaseModel):
    id: str
    name: str
    phone: str
    email: Optional[str]
    date_of_birth: Optional[str]
    address: Optional[str]
    medical_history: Optional[str]
    notes: Optional[str]
    balance_jod: float
    created_at: str

class ProcedureCreate(BaseModel):
    name: str
    name_ar: str
    price_jod: float
    description: Optional[str] = None
    description_ar: Optional[str] = None

class ProcedureUpdate(BaseModel):
    name: Optional[str] = None
    name_ar: Optional[str] = None
    price_jod: Optional[float] = None
    description: Optional[str] = None
    description_ar: Optional[str] = None

class ProcedureResponse(BaseModel):
    id: str
    name: str
    name_ar: str
    price_jod: float
    description: Optional[str]
    description_ar: Optional[str]
    created_at: str

class AppointmentCreate(BaseModel):
    patient_id: str
    doctor_id: str
    appointment_date: str
    appointment_time: str
    duration_minutes: int = 30
    status: str = "scheduled"
    notes: Optional[str] = None

class AppointmentUpdate(BaseModel):
    appointment_date: Optional[str] = None
    appointment_time: Optional[str] = None
    duration_minutes: Optional[int] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class AppointmentResponse(BaseModel):
    id: str
    patient_id: str
    patient_name: str
    doctor_id: str
    doctor_name: str
    appointment_date: str
    appointment_time: str
    duration_minutes: int
    status: str
    notes: Optional[str]
    created_at: str

class VisitCreate(BaseModel):
    patient_id: str
    doctor_id: str
    status: str = "in_progress"
    notes: Optional[str] = None
    procedures: List[dict] = []

class VisitUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None

class VisitResponse(BaseModel):
    id: str
    patient_id: str
    patient_name: str
    doctor_id: str
    doctor_name: str
    visit_date: str
    status: str
    notes: Optional[str]
    procedures: List[dict]
    total_cost_jod: float
    created_at: str

class PaymentCreate(BaseModel):
    patient_id: str
    amount_jod: float
    notes: Optional[str] = None

class PaymentResponse(BaseModel):
    id: str
    patient_id: str
    patient_name: str
    amount_jod: float
    payment_date: str
    recorded_by: str
    recorded_by_name: str
    notes: Optional[str]
    created_at: str

class ImageResponse(BaseModel):
    id: str
    patient_id: str
    patient_name: str
    uploaded_by: str
    uploaded_by_name: str
    image_path: str
    image_type: str
    description: Optional[str]
    upload_date: str

async def init_db():
    global db_client, db
    db_client = AsyncIOMotorClient(MONGO_URL)
    db = db_client[DB_NAME]
    
    admin = await db.users.find_one({"username": "admin"})
    if not admin:
        password_hash = bcrypt.hashpw("admin".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        await db.users.insert_one({
            "username": "admin",
            "password_hash": password_hash,
            "full_name": "System Administrator",
            "role": "admin",
            "is_first_login": True,
            "session_duration_hours": 8,
            "created_at": datetime.now().isoformat()
        })

async def get_current_user(request: Request):
    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    user["id"] = str(user["_id"])
    return user

async def require_role(required_roles: List[str]):
    async def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user["role"] not in required_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return role_checker

@api_router.post("/auth/login")
async def login(request: Request, login_data: LoginRequest):
    user = await db.users.find_one({"username": login_data.username})
    
    if not user or not bcrypt.checkpw(login_data.password.encode('utf-8'), user["password_hash"].encode('utf-8')):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    request.session["user_id"] = str(user["_id"])
    request.session["role"] = user["role"]
    
    return {
        "user": {
            "id": str(user["_id"]),
            "username": user["username"],
            "full_name": user["full_name"],
            "role": user["role"],
            "is_first_login": user.get("is_first_login", False),
            "session_duration_hours": user.get("session_duration_hours", 8)
        }
    }

@api_router.post("/auth/change-password")
async def change_password(request: Request, password_data: PasswordChangeRequest, current_user: dict = Depends(get_current_user)):
    password_hash = bcrypt.hashpw(password_data.new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    await db.users.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": {"password_hash": password_hash, "is_first_login": False}}
    )
    
    return {"message": "Password changed successfully"}

@api_router.post("/auth/logout")
async def logout(request: Request):
    request.session.clear()
    return {"message": "Logged out successfully"}

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "username": current_user["username"],
        "full_name": current_user["full_name"],
        "role": current_user["role"],
        "is_first_login": current_user.get("is_first_login", False),
        "session_duration_hours": current_user.get("session_duration_hours", 8)
    }

@api_router.post("/users", response_model=UserResponse)
async def create_user(user_data: UserCreate, current_user: dict = Depends(require_role(["admin"]))):
    password_hash = bcrypt.hashpw(user_data.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    user_doc = {
        "username": user_data.username,
        "password_hash": password_hash,
        "full_name": user_data.full_name,
        "role": user_data.role,
        "session_duration_hours": user_data.session_duration_hours,
        "is_first_login": True,
        "created_at": datetime.now().isoformat()
    }
    
    result = await db.users.insert_one(user_doc)
    user = await db.users.find_one({"_id": result.inserted_id})
    
    return UserResponse(
        id=str(user["_id"]),
        username=user["username"],
        full_name=user["full_name"],
        role=user["role"],
        session_duration_hours=user["session_duration_hours"],
        is_first_login=user.get("is_first_login", False),
        created_at=user["created_at"]
    )

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(current_user: dict = Depends(require_role(["admin"]))):
    users = await db.users.find().sort("created_at", -1).to_list(length=None)
    
    return [UserResponse(
        id=str(user["_id"]),
        username=user["username"],
        full_name=user["full_name"],
        role=user["role"],
        session_duration_hours=user.get("session_duration_hours", 8),
        is_first_login=user.get("is_first_login", False),
        created_at=user["created_at"]
    ) for user in users]

@api_router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, user_data: UserUpdate, current_user: dict = Depends(require_role(["admin"]))):
    update_data = {}
    
    if user_data.full_name is not None:
        update_data["full_name"] = user_data.full_name
    if user_data.session_duration_hours is not None:
        update_data["session_duration_hours"] = user_data.session_duration_hours
    if user_data.password is not None:
        password_hash = bcrypt.hashpw(user_data.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        update_data["password_hash"] = password_hash
    
    if update_data:
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )
    
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    
    return UserResponse(
        id=str(user["_id"]),
        username=user["username"],
        full_name=user["full_name"],
        role=user["role"],
        session_duration_hours=user.get("session_duration_hours", 8),
        is_first_login=user.get("is_first_login", False),
        created_at=user["created_at"]
    )

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(require_role(["admin"]))):
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    await db.users.delete_one({"_id": ObjectId(user_id)})
    return {"message": "User deleted successfully"}

async def calculate_patient_balance(patient_id: str) -> float:
    pipeline_cost = [
        {"$match": {"patient_id": patient_id}},
        {"$lookup": {
            "from": "procedures",
            "let": {"proc_list": "$procedures"},
            "pipeline": [
                {"$match": {"$expr": {"$in": ["$_id", "$$proc_list.procedure_id"]}}}
            ],
            "as": "proc_details"
        }},
        {"$group": {
            "_id": None,
            "total": {"$sum": {"$multiply": ["$proc_details.price_jod", "$procedures.quantity"]}}
        }}
    ]
    
    result = await db.visits.aggregate(pipeline_cost).to_list(length=None)
    total_cost = result[0]["total"] if result else 0.0
    
    pipeline_paid = [
        {"$match": {"patient_id": patient_id}},
        {"$group": {"_id": None, "total": {"$sum": "$amount_jod"}}}
    ]
    
    result_paid = await db.payments.aggregate(pipeline_paid).to_list(length=None)
    total_paid = result_paid[0]["total"] if result_paid else 0.0
    
    return round(total_cost - total_paid, 2)

@api_router.post("/patients", response_model=PatientResponse)
async def create_patient(patient_data: PatientCreate, current_user: dict = Depends(get_current_user)):
    patient_doc = {
        "name": patient_data.name,
        "phone": patient_data.phone,
        "email": patient_data.email,
        "date_of_birth": patient_data.date_of_birth,
        "address": patient_data.address,
        "medical_history": patient_data.medical_history,
        "notes": patient_data.notes,
        "created_at": datetime.now().isoformat()
    }
    
    result = await db.patients.insert_one(patient_doc)
    patient = await db.patients.find_one({"_id": result.inserted_id})
    
    balance = await calculate_patient_balance(str(patient["_id"]))
    
    return PatientResponse(
        id=str(patient["_id"]),
        name=patient["name"],
        phone=patient["phone"],
        email=patient.get("email"),
        date_of_birth=patient.get("date_of_birth"),
        address=patient.get("address"),
        medical_history=patient.get("medical_history"),
        notes=patient.get("notes"),
        balance_jod=balance,
        created_at=patient["created_at"]
    )

@api_router.get("/patients", response_model=List[PatientResponse])
async def get_patients(current_user: dict = Depends(get_current_user)):
    patients = await db.patients.find().sort("created_at", -1).to_list(length=None)
    
    result = []
    for patient in patients:
        balance = await calculate_patient_balance(str(patient["_id"]))
        result.append(PatientResponse(
            id=str(patient["_id"]),
            name=patient["name"],
            phone=patient["phone"],
            email=patient.get("email"),
            date_of_birth=patient.get("date_of_birth"),
            address=patient.get("address"),
            medical_history=patient.get("medical_history"),
            notes=patient.get("notes"),
            balance_jod=balance,
            created_at=patient["created_at"]
        ))
    
    return result

@api_router.get("/patients/{patient_id}", response_model=PatientResponse)
async def get_patient(patient_id: str, current_user: dict = Depends(get_current_user)):
    patient = await db.patients.find_one({"_id": ObjectId(patient_id)})
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    balance = await calculate_patient_balance(str(patient["_id"]))
    
    return PatientResponse(
        id=str(patient["_id"]),
        name=patient["name"],
        phone=patient["phone"],
        email=patient.get("email"),
        date_of_birth=patient.get("date_of_birth"),
        address=patient.get("address"),
        medical_history=patient.get("medical_history"),
        notes=patient.get("notes"),
        balance_jod=balance,
        created_at=patient["created_at"]
    )

@api_router.put("/patients/{patient_id}", response_model=PatientResponse)
async def update_patient(patient_id: str, patient_data: PatientUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {}
    
    if patient_data.name is not None:
        update_data["name"] = patient_data.name
    if patient_data.phone is not None:
        update_data["phone"] = patient_data.phone
    if patient_data.email is not None:
        update_data["email"] = patient_data.email
    if patient_data.date_of_birth is not None:
        update_data["date_of_birth"] = patient_data.date_of_birth
    if patient_data.address is not None:
        update_data["address"] = patient_data.address
    if patient_data.medical_history is not None:
        update_data["medical_history"] = patient_data.medical_history
    if patient_data.notes is not None:
        update_data["notes"] = patient_data.notes
    
    if update_data:
        await db.patients.update_one(
            {"_id": ObjectId(patient_id)},
            {"$set": update_data}
        )
    
    patient = await db.patients.find_one({"_id": ObjectId(patient_id)})
    balance = await calculate_patient_balance(str(patient["_id"]))
    
    return PatientResponse(
        id=str(patient["_id"]),
        name=patient["name"],
        phone=patient["phone"],
        email=patient.get("email"),
        date_of_birth=patient.get("date_of_birth"),
        address=patient.get("address"),
        medical_history=patient.get("medical_history"),
        notes=patient.get("notes"),
        balance_jod=balance,
        created_at=patient["created_at"]
    )

@api_router.delete("/patients/{patient_id}")
async def delete_patient(patient_id: str, current_user: dict = Depends(require_role(["admin"]))):
    await db.appointments.delete_many({"patient_id": patient_id})
    await db.payments.delete_many({"patient_id": patient_id})
    await db.medical_images.delete_many({"patient_id": patient_id})
    await db.visits.delete_many({"patient_id": patient_id})
    await db.patients.delete_one({"_id": ObjectId(patient_id)})
    
    return {"message": "Patient deleted successfully"}

@api_router.post("/procedures", response_model=ProcedureResponse)
async def create_procedure(procedure_data: ProcedureCreate, current_user: dict = Depends(require_role(["admin"]))):
    procedure_doc = {
        "name": procedure_data.name,
        "name_ar": procedure_data.name_ar,
        "price_jod": procedure_data.price_jod,
        "description": procedure_data.description,
        "description_ar": procedure_data.description_ar,
        "created_at": datetime.now().isoformat()
    }
    
    result = await db.procedures.insert_one(procedure_doc)
    procedure = await db.procedures.find_one({"_id": result.inserted_id})
    
    return ProcedureResponse(
        id=str(procedure["_id"]),
        name=procedure["name"],
        name_ar=procedure["name_ar"],
        price_jod=procedure["price_jod"],
        description=procedure.get("description"),
        description_ar=procedure.get("description_ar"),
        created_at=procedure["created_at"]
    )

@api_router.get("/procedures", response_model=List[ProcedureResponse])
async def get_procedures(current_user: dict = Depends(get_current_user)):
    procedures = await db.procedures.find().sort("name", 1).to_list(length=None)
    
    return [ProcedureResponse(
        id=str(proc["_id"]),
        name=proc["name"],
        name_ar=proc["name_ar"],
        price_jod=proc["price_jod"],
        description=proc.get("description"),
        description_ar=proc.get("description_ar"),
        created_at=proc["created_at"]
    ) for proc in procedures]

@api_router.put("/procedures/{procedure_id}", response_model=ProcedureResponse)
async def update_procedure(procedure_id: str, procedure_data: ProcedureUpdate, current_user: dict = Depends(require_role(["admin"]))):
    update_data = {}
    
    if procedure_data.name is not None:
        update_data["name"] = procedure_data.name
    if procedure_data.name_ar is not None:
        update_data["name_ar"] = procedure_data.name_ar
    if procedure_data.price_jod is not None:
        update_data["price_jod"] = procedure_data.price_jod
    if procedure_data.description is not None:
        update_data["description"] = procedure_data.description
    if procedure_data.description_ar is not None:
        update_data["description_ar"] = procedure_data.description_ar
    
    if update_data:
        await db.procedures.update_one(
            {"_id": ObjectId(procedure_id)},
            {"$set": update_data}
        )
    
    procedure = await db.procedures.find_one({"_id": ObjectId(procedure_id)})
    
    return ProcedureResponse(
        id=str(procedure["_id"]),
        name=procedure["name"],
        name_ar=procedure["name_ar"],
        price_jod=procedure["price_jod"],
        description=procedure.get("description"),
        description_ar=procedure.get("description_ar"),
        created_at=procedure["created_at"]
    )

@api_router.delete("/procedures/{procedure_id}")
async def delete_procedure(procedure_id: str, current_user: dict = Depends(require_role(["admin"]))):
    await db.procedures.delete_one({"_id": ObjectId(procedure_id)})
    return {"message": "Procedure deleted successfully"}

@api_router.post("/appointments", response_model=AppointmentResponse)
async def create_appointment(appointment_data: AppointmentCreate, current_user: dict = Depends(get_current_user)):
    appointment_doc = {
        "patient_id": appointment_data.patient_id,
        "doctor_id": appointment_data.doctor_id,
        "appointment_date": appointment_data.appointment_date,
        "appointment_time": appointment_data.appointment_time,
        "duration_minutes": appointment_data.duration_minutes,
        "status": appointment_data.status,
        "notes": appointment_data.notes,
        "created_at": datetime.now().isoformat()
    }
    
    result = await db.appointments.insert_one(appointment_doc)
    appointment = await db.appointments.find_one({"_id": result.inserted_id})
    
    patient = await db.patients.find_one({"_id": ObjectId(appointment["patient_id"])})
    doctor = await db.users.find_one({"_id": ObjectId(appointment["doctor_id"])})
    
    return AppointmentResponse(
        id=str(appointment["_id"]),
        patient_id=appointment["patient_id"],
        patient_name=patient["name"] if patient else "Unknown",
        doctor_id=appointment["doctor_id"],
        doctor_name=doctor["full_name"] if doctor else "Unknown",
        appointment_date=appointment["appointment_date"],
        appointment_time=appointment["appointment_time"],
        duration_minutes=appointment["duration_minutes"],
        status=appointment["status"],
        notes=appointment.get("notes"),
        created_at=appointment["created_at"]
    )

@api_router.get("/appointments", response_model=List[AppointmentResponse])
async def get_appointments(
    doctor_id: Optional[str] = None,
    date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    
    if current_user["role"] == "doctor":
        query["doctor_id"] = current_user["id"]
    elif doctor_id:
        query["doctor_id"] = doctor_id
    
    if date:
        query["appointment_date"] = date
    
    appointments = await db.appointments.find(query).sort([("appointment_date", 1), ("appointment_time", 1)]).to_list(length=None)
    
    result = []
    for apt in appointments:
        patient = await db.patients.find_one({"_id": ObjectId(apt["patient_id"])})
        doctor = await db.users.find_one({"_id": ObjectId(apt["doctor_id"])})
        
        result.append(AppointmentResponse(
            id=str(apt["_id"]),
            patient_id=apt["patient_id"],
            patient_name=patient["name"] if patient else "Unknown",
            doctor_id=apt["doctor_id"],
            doctor_name=doctor["full_name"] if doctor else "Unknown",
            appointment_date=apt["appointment_date"],
            appointment_time=apt["appointment_time"],
            duration_minutes=apt["duration_minutes"],
            status=apt["status"],
            notes=apt.get("notes"),
            created_at=apt["created_at"]
        ))
    
    return result

@api_router.put("/appointments/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment(appointment_id: str, appointment_data: AppointmentUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {}
    
    if appointment_data.appointment_date is not None:
        update_data["appointment_date"] = appointment_data.appointment_date
    if appointment_data.appointment_time is not None:
        update_data["appointment_time"] = appointment_data.appointment_time
    if appointment_data.duration_minutes is not None:
        update_data["duration_minutes"] = appointment_data.duration_minutes
    if appointment_data.status is not None:
        update_data["status"] = appointment_data.status
    if appointment_data.notes is not None:
        update_data["notes"] = appointment_data.notes
    
    if update_data:
        await db.appointments.update_one(
            {"_id": ObjectId(appointment_id)},
            {"$set": update_data}
        )
    
    appointment = await db.appointments.find_one({"_id": ObjectId(appointment_id)})
    patient = await db.patients.find_one({"_id": ObjectId(appointment["patient_id"])})
    doctor = await db.users.find_one({"_id": ObjectId(appointment["doctor_id"])})
    
    return AppointmentResponse(
        id=str(appointment["_id"]),
        patient_id=appointment["patient_id"],
        patient_name=patient["name"] if patient else "Unknown",
        doctor_id=appointment["doctor_id"],
        doctor_name=doctor["full_name"] if doctor else "Unknown",
        appointment_date=appointment["appointment_date"],
        appointment_time=appointment["appointment_time"],
        duration_minutes=appointment["duration_minutes"],
        status=appointment["status"],
        notes=appointment.get("notes"),
        created_at=appointment["created_at"]
    )

@api_router.delete("/appointments/{appointment_id}")
async def delete_appointment(appointment_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "receptionist"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    await db.appointments.delete_one({"_id": ObjectId(appointment_id)})
    return {"message": "Appointment deleted successfully"}

@api_router.post("/visits", response_model=VisitResponse)
async def create_visit(visit_data: VisitCreate, current_user: dict = Depends(require_role(["doctor", "admin"]))):
    visit_doc = {
        "patient_id": visit_data.patient_id,
        "doctor_id": visit_data.doctor_id,
        "visit_date": datetime.now().isoformat(),
        "status": visit_data.status,
        "notes": visit_data.notes,
        "procedures": visit_data.procedures,
        "created_at": datetime.now().isoformat()
    }
    
    result = await db.visits.insert_one(visit_doc)
    visit = await db.visits.find_one({"_id": result.inserted_id})
    
    patient = await db.patients.find_one({"_id": ObjectId(visit["patient_id"])})
    doctor = await db.users.find_one({"_id": ObjectId(visit["doctor_id"])})
    
    procedures_list = []
    total_cost = 0.0
    
    for proc in visit["procedures"]:
        procedure = await db.procedures.find_one({"_id": ObjectId(proc["procedure_id"])})
        if procedure:
            quantity = proc.get("quantity", 1)
            procedures_list.append({
                "id": str(procedure["_id"]),
                "name": procedure["name"],
                "name_ar": procedure["name_ar"],
                "price_jod": procedure["price_jod"],
                "quantity": quantity
            })
            total_cost += procedure["price_jod"] * quantity
    
    return VisitResponse(
        id=str(visit["_id"]),
        patient_id=visit["patient_id"],
        patient_name=patient["name"] if patient else "Unknown",
        doctor_id=visit["doctor_id"],
        doctor_name=doctor["full_name"] if doctor else "Unknown",
        visit_date=visit["visit_date"],
        status=visit["status"],
        notes=visit.get("notes"),
        procedures=procedures_list,
        total_cost_jod=total_cost,
        created_at=visit["created_at"]
    )

@api_router.get("/visits", response_model=List[VisitResponse])
async def get_visits(patient_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    
    if patient_id:
        query["patient_id"] = patient_id
    
    visits = await db.visits.find(query).sort("visit_date", -1).to_list(length=None)
    
    result = []
    for visit in visits:
        patient = await db.patients.find_one({"_id": ObjectId(visit["patient_id"])})
        doctor = await db.users.find_one({"_id": ObjectId(visit["doctor_id"])})
        
        procedures_list = []
        total_cost = 0.0
        
        for proc in visit.get("procedures", []):
            procedure = await db.procedures.find_one({"_id": ObjectId(proc["procedure_id"])})
            if procedure:
                quantity = proc.get("quantity", 1)
                procedures_list.append({
                    "id": str(procedure["_id"]),
                    "name": procedure["name"],
                    "name_ar": procedure["name_ar"],
                    "price_jod": procedure["price_jod"],
                    "quantity": quantity
                })
                total_cost += procedure["price_jod"] * quantity
        
        result.append(VisitResponse(
            id=str(visit["_id"]),
            patient_id=visit["patient_id"],
            patient_name=patient["name"] if patient else "Unknown",
            doctor_id=visit["doctor_id"],
            doctor_name=doctor["full_name"] if doctor else "Unknown",
            visit_date=visit["visit_date"],
            status=visit["status"],
            notes=visit.get("notes"),
            procedures=procedures_list,
            total_cost_jod=total_cost,
            created_at=visit["created_at"]
        ))
    
    return result

@api_router.put("/visits/{visit_id}", response_model=VisitResponse)
async def update_visit(visit_id: str, visit_data: VisitUpdate, current_user: dict = Depends(require_role(["doctor", "admin"]))):
    update_data = {}
    
    if visit_data.status is not None:
        update_data["status"] = visit_data.status
    if visit_data.notes is not None:
        update_data["notes"] = visit_data.notes
    
    if update_data:
        await db.visits.update_one(
            {"_id": ObjectId(visit_id)},
            {"$set": update_data}
        )
    
    visit = await db.visits.find_one({"_id": ObjectId(visit_id)})
    patient = await db.patients.find_one({"_id": ObjectId(visit["patient_id"])})
    doctor = await db.users.find_one({"_id": ObjectId(visit["doctor_id"])})
    
    procedures_list = []
    total_cost = 0.0
    
    for proc in visit.get("procedures", []):
        procedure = await db.procedures.find_one({"_id": ObjectId(proc["procedure_id"])})
        if procedure:
            quantity = proc.get("quantity", 1)
            procedures_list.append({
                "id": str(procedure["_id"]),
                "name": procedure["name"],
                "name_ar": procedure["name_ar"],
                "price_jod": procedure["price_jod"],
                "quantity": quantity
            })
            total_cost += procedure["price_jod"] * quantity
    
    return VisitResponse(
        id=str(visit["_id"]),
        patient_id=visit["patient_id"],
        patient_name=patient["name"] if patient else "Unknown",
        doctor_id=visit["doctor_id"],
        doctor_name=doctor["full_name"] if doctor else "Unknown",
        visit_date=visit["visit_date"],
        status=visit["status"],
        notes=visit.get("notes"),
        procedures=procedures_list,
        total_cost_jod=total_cost,
        created_at=visit["created_at"]
    )

@api_router.post("/payments", response_model=PaymentResponse)
async def create_payment(payment_data: PaymentCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["receptionist", "admin"]:
        raise HTTPException(status_code=403, detail="Only receptionist and admin can record payments")
    
    payment_doc = {
        "patient_id": payment_data.patient_id,
        "amount_jod": payment_data.amount_jod,
        "payment_date": datetime.now().isoformat(),
        "recorded_by": current_user["id"],
        "notes": payment_data.notes,
        "created_at": datetime.now().isoformat()
    }
    
    result = await db.payments.insert_one(payment_doc)
    payment = await db.payments.find_one({"_id": result.inserted_id})
    
    patient = await db.patients.find_one({"_id": ObjectId(payment["patient_id"])})
    user = await db.users.find_one({"_id": ObjectId(payment["recorded_by"])})
    
    return PaymentResponse(
        id=str(payment["_id"]),
        patient_id=payment["patient_id"],
        patient_name=patient["name"] if patient else "Unknown",
        amount_jod=payment["amount_jod"],
        payment_date=payment["payment_date"],
        recorded_by=payment["recorded_by"],
        recorded_by_name=user["full_name"] if user else "Unknown",
        notes=payment.get("notes"),
        created_at=payment["created_at"]
    )

@api_router.get("/payments", response_model=List[PaymentResponse])
async def get_payments(patient_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    
    if patient_id:
        query["patient_id"] = patient_id
    
    payments = await db.payments.find(query).sort("payment_date", -1).to_list(length=None)
    
    result = []
    for pm in payments:
        patient = await db.patients.find_one({"_id": ObjectId(pm["patient_id"])})
        user = await db.users.find_one({"_id": ObjectId(pm["recorded_by"])})
        
        result.append(PaymentResponse(
            id=str(pm["_id"]),
            patient_id=pm["patient_id"],
            patient_name=patient["name"] if patient else "Unknown",
            amount_jod=pm["amount_jod"],
            payment_date=pm["payment_date"],
            recorded_by=pm["recorded_by"],
            recorded_by_name=user["full_name"] if user else "Unknown",
            notes=pm.get("notes"),
            created_at=pm["created_at"]
        ))
    
    return result

@api_router.post("/images/upload")
async def upload_image(
    patient_id: str = Form(...),
    image_type: str = Form(...),
    description: str = Form(None),
    file: UploadFile = File(...),
    current_user: dict = Depends(require_role(["doctor", "admin"]))
):
    patient_dir = UPLOADS_DIR / patient_id
    patient_dir.mkdir(exist_ok=True)
    
    file_extension = file.filename.split(".")[-1]
    file_name = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}.{file_extension}"
    file_path = patient_dir / file_name
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    relative_path = f"{patient_id}/{file_name}"
    
    image_doc = {
        "patient_id": patient_id,
        "uploaded_by": current_user["id"],
        "image_path": relative_path,
        "image_type": image_type,
        "description": description,
        "upload_date": datetime.now().isoformat()
    }
    
    result = await db.medical_images.insert_one(image_doc)
    
    return {"id": str(result.inserted_id), "image_path": relative_path}

@api_router.get("/images/{image_id}")
async def get_image(image_id: str, current_user: dict = Depends(get_current_user)):
    image = await db.medical_images.find_one({"_id": ObjectId(image_id)})
    
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    file_path = UPLOADS_DIR / image["image_path"]
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image file not found")
    
    return FileResponse(file_path)

@api_router.get("/images/patient/{patient_id}", response_model=List[ImageResponse])
async def get_patient_images(patient_id: str, current_user: dict = Depends(get_current_user)):
    images = await db.medical_images.find({"patient_id": patient_id}).sort("upload_date", -1).to_list(length=None)
    
    result = []
    for img in images:
        patient = await db.patients.find_one({"_id": ObjectId(img["patient_id"])})
        user = await db.users.find_one({"_id": ObjectId(img["uploaded_by"])})
        
        result.append(ImageResponse(
            id=str(img["_id"]),
            patient_id=img["patient_id"],
            patient_name=patient["name"] if patient else "Unknown",
            uploaded_by=img["uploaded_by"],
            uploaded_by_name=user["full_name"] if user else "Unknown",
            image_path=img["image_path"],
            image_type=img["image_type"],
            description=img.get("description"),
            upload_date=img["upload_date"]
        ))
    
    return result

@api_router.delete("/images/{image_id}")
async def delete_image(image_id: str, current_user: dict = Depends(require_role(["doctor", "admin"]))):
    image = await db.medical_images.find_one({"_id": ObjectId(image_id)})
    
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    file_path = UPLOADS_DIR / image["image_path"]
    if file_path.exists():
        file_path.unlink()
    
    await db.medical_images.delete_one({"_id": ObjectId(image_id)})
    
    return {"message": "Image deleted successfully"}

@api_router.get("/doctors", response_model=List[UserResponse])
async def get_doctors(current_user: dict = Depends(get_current_user)):
    doctors = await db.users.find({"role": "doctor"}).sort("full_name", 1).to_list(length=None)
    
    return [UserResponse(
        id=str(doc["_id"]),
        username=doc["username"],
        full_name=doc["full_name"],
        role=doc["role"],
        session_duration_hours=doc.get("session_duration_hours", 8),
        is_first_login=doc.get("is_first_login", False),
        created_at=doc["created_at"]
    ) for doc in doctors]

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    SessionMiddleware,
    secret_key=SESSION_SECRET,
    max_age=None
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    await init_db()
    logger.info("Database initialized")

@app.on_event("shutdown")
async def shutdown_event():
    if db_client:
        db_client.close()
    logger.info("Application shutting down")
