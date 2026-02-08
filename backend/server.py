from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, Response, Request
from fastapi.responses import FileResponse
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timedelta
from pathlib import Path
import aiosqlite
import bcrypt
import os
import secrets
import shutil
import logging
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Database setup
DB_PATH = ROOT_DIR / "clinic.db"
UPLOADS_DIR = ROOT_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Session secret
SESSION_SECRET = os.environ.get('SESSION_SECRET', secrets.token_hex(32))

# Models
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
    id: int
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
    id: int
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
    price_jod: float
    description: Optional[str] = None

class ProcedureUpdate(BaseModel):
    name: Optional[str] = None
    price_jod: Optional[float] = None
    description: Optional[str] = None

class ProcedureResponse(BaseModel):
    id: int
    name: str
    price_jod: float
    description: Optional[str]
    created_at: str

class AppointmentCreate(BaseModel):
    patient_id: int
    doctor_id: int
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
    id: int
    patient_id: int
    patient_name: str
    doctor_id: int
    doctor_name: str
    appointment_date: str
    appointment_time: str
    duration_minutes: int
    status: str
    notes: Optional[str]
    created_at: str

class VisitCreate(BaseModel):
    patient_id: int
    doctor_id: int
    status: str = "in_progress"
    notes: Optional[str] = None
    procedures: List[dict] = []

class VisitUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None

class VisitResponse(BaseModel):
    id: int
    patient_id: int
    patient_name: str
    doctor_id: int
    doctor_name: str
    visit_date: str
    status: str
    notes: Optional[str]
    procedures: List[dict]
    total_cost_jod: float
    created_at: str

class PaymentCreate(BaseModel):
    patient_id: int
    amount_jod: float
    notes: Optional[str] = None

class PaymentResponse(BaseModel):
    id: int
    patient_id: int
    patient_name: str
    amount_jod: float
    payment_date: str
    recorded_by: int
    recorded_by_name: str
    notes: Optional[str]
    created_at: str

class ImageResponse(BaseModel):
    id: int
    patient_id: int
    patient_name: str
    uploaded_by: int
    uploaded_by_name: str
    image_path: str
    image_type: str
    description: Optional[str]
    upload_date: str

# Database initialization
async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                full_name TEXT NOT NULL,
                role TEXT NOT NULL,
                is_first_login INTEGER DEFAULT 1,
                session_duration_hours INTEGER DEFAULT 8,
                created_at TEXT NOT NULL
            )
        """)
        
        await db.execute("""
            CREATE TABLE IF NOT EXISTS patients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                phone TEXT NOT NULL,
                email TEXT,
                date_of_birth TEXT,
                address TEXT,
                medical_history TEXT,
                notes TEXT,
                created_at TEXT NOT NULL
            )
        """)
        
        await db.execute("""
            CREATE TABLE IF NOT EXISTS procedures (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                price_jod REAL NOT NULL,
                description TEXT,
                created_at TEXT NOT NULL
            )
        """)
        
        await db.execute("""
            CREATE TABLE IF NOT EXISTS appointments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id INTEGER NOT NULL,
                doctor_id INTEGER NOT NULL,
                appointment_date TEXT NOT NULL,
                appointment_time TEXT NOT NULL,
                duration_minutes INTEGER DEFAULT 30,
                status TEXT DEFAULT 'scheduled',
                notes TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (patient_id) REFERENCES patients(id),
                FOREIGN KEY (doctor_id) REFERENCES users(id)
            )
        """)
        
        await db.execute("""
            CREATE TABLE IF NOT EXISTS visits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id INTEGER NOT NULL,
                doctor_id INTEGER NOT NULL,
                visit_date TEXT NOT NULL,
                status TEXT DEFAULT 'in_progress',
                notes TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (patient_id) REFERENCES patients(id),
                FOREIGN KEY (doctor_id) REFERENCES users(id)
            )
        """)
        
        await db.execute("""
            CREATE TABLE IF NOT EXISTS visit_procedures (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                visit_id INTEGER NOT NULL,
                procedure_id INTEGER NOT NULL,
                quantity INTEGER DEFAULT 1,
                created_at TEXT NOT NULL,
                FOREIGN KEY (visit_id) REFERENCES visits(id),
                FOREIGN KEY (procedure_id) REFERENCES procedures(id)
            )
        """)
        
        await db.execute("""
            CREATE TABLE IF NOT EXISTS payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id INTEGER NOT NULL,
                amount_jod REAL NOT NULL,
                payment_date TEXT NOT NULL,
                recorded_by INTEGER NOT NULL,
                notes TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (patient_id) REFERENCES patients(id),
                FOREIGN KEY (recorded_by) REFERENCES users(id)
            )
        """)
        
        await db.execute("""
            CREATE TABLE IF NOT EXISTS medical_images (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id INTEGER NOT NULL,
                uploaded_by INTEGER NOT NULL,
                image_path TEXT NOT NULL,
                image_type TEXT NOT NULL,
                description TEXT,
                upload_date TEXT NOT NULL,
                FOREIGN KEY (patient_id) REFERENCES patients(id),
                FOREIGN KEY (uploaded_by) REFERENCES users(id)
            )
        """)
        
        # Create default admin if not exists
        cursor = await db.execute("SELECT id FROM users WHERE username = ?", ("admin",))
        admin = await cursor.fetchone()
        
        if not admin:
            password_hash = bcrypt.hashpw("admin".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            await db.execute(
                "INSERT INTO users (username, password_hash, full_name, role, is_first_login, session_duration_hours, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                ("admin", password_hash, "System Administrator", "admin", 1, 8, datetime.now().isoformat())
            )
        
        await db.commit()

# Session helpers
async def get_current_user(request: Request):
    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        user = await cursor.fetchone()
        
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        return dict(user)

from typing import List
from fastapi import Depends, HTTPException

def require_role(required_roles: List[str]):
    async def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user.get("role") not in required_roles:
            raise HTTPException(
                status_code=403,
                detail="Insufficient permissions"
            )
        return current_user

    return role_checker

# Auth routes
@api_router.post("/auth/login")
async def login(request: Request, login_data: LoginRequest):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM users WHERE username = ?", (login_data.username,))
        user = await cursor.fetchone()
        
        if not user or not bcrypt.checkpw(login_data.password.encode('utf-8'), user["password_hash"].encode('utf-8')):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        request.session["user_id"] = user["id"]
        request.session["role"] = user["role"]
        
        return {
            "user": {
                "id": user["id"],
                "username": user["username"],
                "full_name": user["full_name"],
                "role": user["role"],
                "is_first_login": bool(user["is_first_login"]),
                "session_duration_hours": user["session_duration_hours"]
            }
        }

@api_router.post("/auth/change-password")
async def change_password(request: Request, password_data: PasswordChangeRequest, current_user: dict = Depends(get_current_user)):
    password_hash = bcrypt.hashpw(password_data.new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE users SET password_hash = ?, is_first_login = 0 WHERE id = ?",
            (password_hash, current_user["id"])
        )
        await db.commit()
    
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
        "is_first_login": bool(current_user["is_first_login"]),
        "session_duration_hours": current_user["session_duration_hours"]
    }

# User management routes (Admin only)
@api_router.post("/users", response_model=UserResponse)
async def create_user(user_data: UserCreate, current_user: dict = Depends(require_role(["admin"]))):
    password_hash = bcrypt.hashpw(user_data.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "INSERT INTO users (username, password_hash, full_name, role, session_duration_hours, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (user_data.username, password_hash, user_data.full_name, user_data.role, user_data.session_duration_hours, datetime.now().isoformat())
        )
        await db.commit()
        user_id = cursor.lastrowid
        
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        user = await cursor.fetchone()
        
        return UserResponse(
            id=user["id"],
            username=user["username"],
            full_name=user["full_name"],
            role=user["role"],
            session_duration_hours=user["session_duration_hours"],
            is_first_login=bool(user["is_first_login"]),
            created_at=user["created_at"]
        )

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(current_user: dict = Depends(require_role(["admin"]))):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM users ORDER BY created_at DESC")
        users = await cursor.fetchall()
        
        return [UserResponse(
            id=user["id"],
            username=user["username"],
            full_name=user["full_name"],
            role=user["role"],
            session_duration_hours=user["session_duration_hours"],
            is_first_login=bool(user["is_first_login"]),
            created_at=user["created_at"]
        ) for user in users]

@api_router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: int, user_data: UserUpdate, current_user: dict = Depends(require_role(["admin"]))):
    async with aiosqlite.connect(DB_PATH) as db:
        updates = []
        params = []
        
        if user_data.full_name is not None:
            updates.append("full_name = ?")
            params.append(user_data.full_name)
        
        if user_data.session_duration_hours is not None:
            updates.append("session_duration_hours = ?")
            params.append(user_data.session_duration_hours)
        
        if user_data.password is not None:
            password_hash = bcrypt.hashpw(user_data.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            updates.append("password_hash = ?")
            params.append(password_hash)
        
        if updates:
            params.append(user_id)
            await db.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = ?", params)
            await db.commit()
        
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        user = await cursor.fetchone()
        
        return UserResponse(
            id=user["id"],
            username=user["username"],
            full_name=user["full_name"],
            role=user["role"],
            session_duration_hours=user["session_duration_hours"],
            is_first_login=bool(user["is_first_login"]),
            created_at=user["created_at"]
        )

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: int, current_user: dict = Depends(require_role(["admin"]))):
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("DELETE FROM users WHERE id = ?", (user_id,))
        await db.commit()
    
    return {"message": "User deleted successfully"}

# Patient routes
@api_router.post("/patients", response_model=PatientResponse)
async def create_patient(patient_data: PatientCreate, current_user: dict = Depends(get_current_user)):
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "INSERT INTO patients (name, phone, email, date_of_birth, address, medical_history, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (patient_data.name, patient_data.phone, patient_data.email, patient_data.date_of_birth, 
             patient_data.address, patient_data.medical_history, patient_data.notes, datetime.now().isoformat())
        )
        await db.commit()
        patient_id = cursor.lastrowid
        
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM patients WHERE id = ?", (patient_id,))
        patient = await cursor.fetchone()
        
        balance = await calculate_patient_balance(db, patient_id)
        
        return PatientResponse(
            id=patient["id"],
            name=patient["name"],
            phone=patient["phone"],
            email=patient["email"],
            date_of_birth=patient["date_of_birth"],
            address=patient["address"],
            medical_history=patient["medical_history"],
            notes=patient["notes"],
            balance_jod=balance,
            created_at=patient["created_at"]
        )

@api_router.get("/patients", response_model=List[PatientResponse])
async def get_patients(current_user: dict = Depends(get_current_user)):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM patients ORDER BY created_at DESC")
        patients = await cursor.fetchall()
        
        result = []
        for patient in patients:
            balance = await calculate_patient_balance(db, patient["id"])
            result.append(PatientResponse(
                id=patient["id"],
                name=patient["name"],
                phone=patient["phone"],
                email=patient["email"],
                date_of_birth=patient["date_of_birth"],
                address=patient["address"],
                medical_history=patient["medical_history"],
                notes=patient["notes"],
                balance_jod=balance,
                created_at=patient["created_at"]
            ))
        
        return result

@api_router.get("/patients/{patient_id}", response_model=PatientResponse)
async def get_patient(patient_id: int, current_user: dict = Depends(get_current_user)):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM patients WHERE id = ?", (patient_id,))
        patient = await cursor.fetchone()
        
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        balance = await calculate_patient_balance(db, patient_id)
        
        return PatientResponse(
            id=patient["id"],
            name=patient["name"],
            phone=patient["phone"],
            email=patient["email"],
            date_of_birth=patient["date_of_birth"],
            address=patient["address"],
            medical_history=patient["medical_history"],
            notes=patient["notes"],
            balance_jod=balance,
            created_at=patient["created_at"]
        )

@api_router.put("/patients/{patient_id}", response_model=PatientResponse)
async def update_patient(patient_id: int, patient_data: PatientUpdate, current_user: dict = Depends(get_current_user)):
    async with aiosqlite.connect(DB_PATH) as db:
        updates = []
        params = []
        
        if patient_data.name is not None:
            updates.append("name = ?")
            params.append(patient_data.name)
        if patient_data.phone is not None:
            updates.append("phone = ?")
            params.append(patient_data.phone)
        if patient_data.email is not None:
            updates.append("email = ?")
            params.append(patient_data.email)
        if patient_data.date_of_birth is not None:
            updates.append("date_of_birth = ?")
            params.append(patient_data.date_of_birth)
        if patient_data.address is not None:
            updates.append("address = ?")
            params.append(patient_data.address)
        if patient_data.medical_history is not None:
            updates.append("medical_history = ?")
            params.append(patient_data.medical_history)
        if patient_data.notes is not None:
            updates.append("notes = ?")
            params.append(patient_data.notes)
        
        if updates:
            params.append(patient_id)
            await db.execute(f"UPDATE patients SET {', '.join(updates)} WHERE id = ?", params)
            await db.commit()
        
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM patients WHERE id = ?", (patient_id,))
        patient = await cursor.fetchone()
        
        balance = await calculate_patient_balance(db, patient_id)
        
        return PatientResponse(
            id=patient["id"],
            name=patient["name"],
            phone=patient["phone"],
            email=patient["email"],
            date_of_birth=patient["date_of_birth"],
            address=patient["address"],
            medical_history=patient["medical_history"],
            notes=patient["notes"],
            balance_jod=balance,
            created_at=patient["created_at"]
        )

@api_router.delete("/patients/{patient_id}")
async def delete_patient(patient_id: int, current_user: dict = Depends(require_role(["admin"]))):
    async with aiosqlite.connect(DB_PATH) as db:
        # Delete related records
        await db.execute("DELETE FROM appointments WHERE patient_id = ?", (patient_id,))
        await db.execute("DELETE FROM payments WHERE patient_id = ?", (patient_id,))
        await db.execute("DELETE FROM medical_images WHERE patient_id = ?", (patient_id,))
        
        # Delete visits and their procedures
        cursor = await db.execute("SELECT id FROM visits WHERE patient_id = ?", (patient_id,))
        visits = await cursor.fetchall()
        for visit in visits:
            await db.execute("DELETE FROM visit_procedures WHERE visit_id = ?", (visit[0],))
        await db.execute("DELETE FROM visits WHERE patient_id = ?", (patient_id,))
        
        # Delete patient
        await db.execute("DELETE FROM patients WHERE id = ?", (patient_id,))
        await db.commit()
    
    return {"message": "Patient deleted successfully"}

# Helper function to calculate patient balance
async def calculate_patient_balance(db, patient_id: int) -> float:
    # Calculate total cost from visits
    cursor = await db.execute("""
        SELECT SUM(p.price_jod * vp.quantity) as total_cost
        FROM visits v
        JOIN visit_procedures vp ON v.id = vp.visit_id
        JOIN procedures p ON vp.procedure_id = p.id
        WHERE v.patient_id = ?
    """, (patient_id,))
    result = await cursor.fetchone()
    total_cost = result[0] if result[0] else 0.0
    
    # Calculate total payments
    cursor = await db.execute("""
        SELECT SUM(amount_jod) as total_paid
        FROM payments
        WHERE patient_id = ?
    """, (patient_id,))
    result = await cursor.fetchone()
    total_paid = result[0] if result[0] else 0.0
    
    return round(total_cost - total_paid, 2)

# Procedure routes
@api_router.post("/procedures", response_model=ProcedureResponse)
async def create_procedure(procedure_data: ProcedureCreate, current_user: dict = Depends(require_role(["admin"]))):
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "INSERT INTO procedures (name, price_jod, description, created_at) VALUES (?, ?, ?, ?)",
            (procedure_data.name, procedure_data.price_jod, procedure_data.description, datetime.now().isoformat())
        )
        await db.commit()
        procedure_id = cursor.lastrowid
        
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM procedures WHERE id = ?", (procedure_id,))
        procedure = await cursor.fetchone()
        
        return ProcedureResponse(
            id=procedure["id"],
            name=procedure["name"],
            price_jod=procedure["price_jod"],
            description=procedure["description"],
            created_at=procedure["created_at"]
        )

@api_router.get("/procedures", response_model=List[ProcedureResponse])
async def get_procedures(current_user: dict = Depends(get_current_user)):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM procedures ORDER BY name")
        procedures = await cursor.fetchall()
        
        return [ProcedureResponse(
            id=proc["id"],
            name=proc["name"],
            price_jod=proc["price_jod"],
            description=proc["description"],
            created_at=proc["created_at"]
        ) for proc in procedures]

@api_router.put("/procedures/{procedure_id}", response_model=ProcedureResponse)
async def update_procedure(procedure_id: int, procedure_data: ProcedureUpdate, current_user: dict = Depends(require_role(["admin"]))):
    async with aiosqlite.connect(DB_PATH) as db:
        updates = []
        params = []
        
        if procedure_data.name is not None:
            updates.append("name = ?")
            params.append(procedure_data.name)
        if procedure_data.price_jod is not None:
            updates.append("price_jod = ?")
            params.append(procedure_data.price_jod)
        if procedure_data.description is not None:
            updates.append("description = ?")
            params.append(procedure_data.description)
        
        if updates:
            params.append(procedure_id)
            await db.execute(f"UPDATE procedures SET {', '.join(updates)} WHERE id = ?", params)
            await db.commit()
        
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM procedures WHERE id = ?", (procedure_id,))
        procedure = await cursor.fetchone()
        
        return ProcedureResponse(
            id=procedure["id"],
            name=procedure["name"],
            price_jod=procedure["price_jod"],
            description=procedure["description"],
            created_at=procedure["created_at"]
        )

@api_router.delete("/procedures/{procedure_id}")
async def delete_procedure(procedure_id: int, current_user: dict = Depends(require_role(["admin"]))):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("DELETE FROM procedures WHERE id = ?", (procedure_id,))
        await db.commit()
    
    return {"message": "Procedure deleted successfully"}

# Appointment routes
@api_router.post("/appointments", response_model=AppointmentResponse)
async def create_appointment(appointment_data: AppointmentCreate, current_user: dict = Depends(get_current_user)):
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, duration_minutes, status, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (appointment_data.patient_id, appointment_data.doctor_id, appointment_data.appointment_date,
             appointment_data.appointment_time, appointment_data.duration_minutes, appointment_data.status,
             appointment_data.notes, datetime.now().isoformat())
        )
        await db.commit()
        appointment_id = cursor.lastrowid
        
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("""
            SELECT a.*, p.name as patient_name, u.full_name as doctor_name
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            JOIN users u ON a.doctor_id = u.id
            WHERE a.id = ?
        """, (appointment_id,))
        appointment = await cursor.fetchone()
        
        return AppointmentResponse(
            id=appointment["id"],
            patient_id=appointment["patient_id"],
            patient_name=appointment["patient_name"],
            doctor_id=appointment["doctor_id"],
            doctor_name=appointment["doctor_name"],
            appointment_date=appointment["appointment_date"],
            appointment_time=appointment["appointment_time"],
            duration_minutes=appointment["duration_minutes"],
            status=appointment["status"],
            notes=appointment["notes"],
            created_at=appointment["created_at"]
        )

@api_router.get("/appointments", response_model=List[AppointmentResponse])
async def get_appointments(
    doctor_id: Optional[int] = None,
    date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        
        query = """
            SELECT a.*, p.name as patient_name, u.full_name as doctor_name
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            JOIN users u ON a.doctor_id = u.id
            WHERE 1=1
        """
        params = []
        
        if current_user["role"] == "doctor":
            query += " AND a.doctor_id = ?"
            params.append(current_user["id"])
        elif doctor_id is not None:
            query += " AND a.doctor_id = ?"
            params.append(doctor_id)
        
        if date:
            query += " AND a.appointment_date = ?"
            params.append(date)
        
        query += " ORDER BY a.appointment_date, a.appointment_time"
        
        cursor = await db.execute(query, params)
        appointments = await cursor.fetchall()
        
        return [AppointmentResponse(
            id=apt["id"],
            patient_id=apt["patient_id"],
            patient_name=apt["patient_name"],
            doctor_id=apt["doctor_id"],
            doctor_name=apt["doctor_name"],
            appointment_date=apt["appointment_date"],
            appointment_time=apt["appointment_time"],
            duration_minutes=apt["duration_minutes"],
            status=apt["status"],
            notes=apt["notes"],
            created_at=apt["created_at"]
        ) for apt in appointments]

@api_router.put("/appointments/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment(appointment_id: int, appointment_data: AppointmentUpdate, current_user: dict = Depends(get_current_user)):
    async with aiosqlite.connect(DB_PATH) as db:
        updates = []
        params = []
        
        if appointment_data.appointment_date is not None:
            updates.append("appointment_date = ?")
            params.append(appointment_data.appointment_date)
        if appointment_data.appointment_time is not None:
            updates.append("appointment_time = ?")
            params.append(appointment_data.appointment_time)
        if appointment_data.duration_minutes is not None:
            updates.append("duration_minutes = ?")
            params.append(appointment_data.duration_minutes)
        if appointment_data.status is not None:
            updates.append("status = ?")
            params.append(appointment_data.status)
        if appointment_data.notes is not None:
            updates.append("notes = ?")
            params.append(appointment_data.notes)
        
        if updates:
            params.append(appointment_id)
            await db.execute(f"UPDATE appointments SET {', '.join(updates)} WHERE id = ?", params)
            await db.commit()
        
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("""
            SELECT a.*, p.name as patient_name, u.full_name as doctor_name
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            JOIN users u ON a.doctor_id = u.id
            WHERE a.id = ?
        """, (appointment_id,))
        appointment = await cursor.fetchone()
        
        return AppointmentResponse(
            id=appointment["id"],
            patient_id=appointment["patient_id"],
            patient_name=appointment["patient_name"],
            doctor_id=appointment["doctor_id"],
            doctor_name=appointment["doctor_name"],
            appointment_date=appointment["appointment_date"],
            appointment_time=appointment["appointment_time"],
            duration_minutes=appointment["duration_minutes"],
            status=appointment["status"],
            notes=appointment["notes"],
            created_at=appointment["created_at"]
        )

@api_router.delete("/appointments/{appointment_id}")
async def delete_appointment(appointment_id: int, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "receptionist"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("DELETE FROM appointments WHERE id = ?", (appointment_id,))
        await db.commit()
    
    return {"message": "Appointment deleted successfully"}

# Visit routes
@api_router.post("/visits", response_model=VisitResponse)
async def create_visit(visit_data: VisitCreate, current_user: dict = Depends(require_role(["doctor", "admin"]))):
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "INSERT INTO visits (patient_id, doctor_id, visit_date, status, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (visit_data.patient_id, visit_data.doctor_id, datetime.now().isoformat(),
             visit_data.status, visit_data.notes, datetime.now().isoformat())
        )
        await db.commit()
        visit_id = cursor.lastrowid
        
        # Add procedures
        for proc in visit_data.procedures:
            await db.execute(
                "INSERT INTO visit_procedures (visit_id, procedure_id, quantity, created_at) VALUES (?, ?, ?, ?)",
                (visit_id, proc["procedure_id"], proc.get("quantity", 1), datetime.now().isoformat())
            )
        await db.commit()
        
        # Fetch visit with details
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("""
            SELECT v.*, p.name as patient_name, u.full_name as doctor_name
            FROM visits v
            JOIN patients p ON v.patient_id = p.id
            JOIN users u ON v.doctor_id = u.id
            WHERE v.id = ?
        """, (visit_id,))
        visit = await cursor.fetchone()
        
        # Fetch procedures
        cursor = await db.execute("""
            SELECT vp.quantity, pr.id, pr.name, pr.price_jod
            FROM visit_procedures vp
            JOIN procedures pr ON vp.procedure_id = pr.id
            WHERE vp.visit_id = ?
        """, (visit_id,))
        procedures = await cursor.fetchall()
        
        procedures_list = [{
            "id": proc["id"],
            "name": proc["name"],
            "price_jod": proc["price_jod"],
            "quantity": proc["quantity"]
        } for proc in procedures]
        
        total_cost = sum(p["price_jod"] * p["quantity"] for p in procedures_list)
        
        return VisitResponse(
            id=visit["id"],
            patient_id=visit["patient_id"],
            patient_name=visit["patient_name"],
            doctor_id=visit["doctor_id"],
            doctor_name=visit["doctor_name"],
            visit_date=visit["visit_date"],
            status=visit["status"],
            notes=visit["notes"],
            procedures=procedures_list,
            total_cost_jod=total_cost,
            created_at=visit["created_at"]
        )

@api_router.get("/visits", response_model=List[VisitResponse])
async def get_visits(patient_id: Optional[int] = None, current_user: dict = Depends(get_current_user)):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        
        query = """
            SELECT v.*, p.name as patient_name, u.full_name as doctor_name
            FROM visits v
            JOIN patients p ON v.patient_id = p.id
            JOIN users u ON v.doctor_id = u.id
            WHERE 1=1
        """
        params = []
        
        if patient_id is not None:
            query += " AND v.patient_id = ?"
            params.append(patient_id)
        
        query += " ORDER BY v.visit_date DESC"
        
        cursor = await db.execute(query, params)
        visits = await cursor.fetchall()
        
        result = []
        for visit in visits:
            # Fetch procedures for this visit
            cursor = await db.execute("""
                SELECT vp.quantity, pr.id, pr.name, pr.price_jod
                FROM visit_procedures vp
                JOIN procedures pr ON vp.procedure_id = pr.id
                WHERE vp.visit_id = ?
            """, (visit["id"],))
            procedures = await cursor.fetchall()
            
            procedures_list = [{
                "id": proc["id"],
                "name": proc["name"],
                "price_jod": proc["price_jod"],
                "quantity": proc["quantity"]
            } for proc in procedures]
            
            total_cost = sum(p["price_jod"] * p["quantity"] for p in procedures_list)
            
            result.append(VisitResponse(
                id=visit["id"],
                patient_id=visit["patient_id"],
                patient_name=visit["patient_name"],
                doctor_id=visit["doctor_id"],
                doctor_name=visit["doctor_name"],
                visit_date=visit["visit_date"],
                status=visit["status"],
                notes=visit["notes"],
                procedures=procedures_list,
                total_cost_jod=total_cost,
                created_at=visit["created_at"]
            ))
        
        return result

@api_router.put("/visits/{visit_id}", response_model=VisitResponse)
async def update_visit(visit_id: int, visit_data: VisitUpdate, current_user: dict = Depends(require_role(["doctor", "admin"]))):
    async with aiosqlite.connect(DB_PATH) as db:
        updates = []
        params = []
        
        if visit_data.status is not None:
            updates.append("status = ?")
            params.append(visit_data.status)
        if visit_data.notes is not None:
            updates.append("notes = ?")
            params.append(visit_data.notes)
        
        if updates:
            params.append(visit_id)
            await db.execute(f"UPDATE visits SET {', '.join(updates)} WHERE id = ?", params)
            await db.commit()
        
        # Fetch updated visit
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("""
            SELECT v.*, p.name as patient_name, u.full_name as doctor_name
            FROM visits v
            JOIN patients p ON v.patient_id = p.id
            JOIN users u ON v.doctor_id = u.id
            WHERE v.id = ?
        """, (visit_id,))
        visit = await cursor.fetchone()
        
        # Fetch procedures
        cursor = await db.execute("""
            SELECT vp.quantity, pr.id, pr.name, pr.price_jod
            FROM visit_procedures vp
            JOIN procedures pr ON vp.procedure_id = pr.id
            WHERE vp.visit_id = ?
        """, (visit_id,))
        procedures = await cursor.fetchall()
        
        procedures_list = [{
            "id": proc["id"],
            "name": proc["name"],
            "price_jod": proc["price_jod"],
            "quantity": proc["quantity"]
        } for proc in procedures]
        
        total_cost = sum(p["price_jod"] * p["quantity"] for p in procedures_list)
        
        return VisitResponse(
            id=visit["id"],
            patient_id=visit["patient_id"],
            patient_name=visit["patient_name"],
            doctor_id=visit["doctor_id"],
            doctor_name=visit["doctor_name"],
            visit_date=visit["visit_date"],
            status=visit["status"],
            notes=visit["notes"],
            procedures=procedures_list,
            total_cost_jod=total_cost,
            created_at=visit["created_at"]
        )

# Payment routes
@api_router.post("/payments", response_model=PaymentResponse)
async def create_payment(payment_data: PaymentCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["receptionist", "admin"]:
        raise HTTPException(status_code=403, detail="Only receptionist and admin can record payments")
    
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "INSERT INTO payments (patient_id, amount_jod, payment_date, recorded_by, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (payment_data.patient_id, payment_data.amount_jod, datetime.now().isoformat(),
             current_user["id"], payment_data.notes, datetime.now().isoformat())
        )
        await db.commit()
        payment_id = cursor.lastrowid
        
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("""
            SELECT pm.*, p.name as patient_name, u.full_name as recorded_by_name
            FROM payments pm
            JOIN patients p ON pm.patient_id = p.id
            JOIN users u ON pm.recorded_by = u.id
            WHERE pm.id = ?
        """, (payment_id,))
        payment = await cursor.fetchone()
        
        return PaymentResponse(
            id=payment["id"],
            patient_id=payment["patient_id"],
            patient_name=payment["patient_name"],
            amount_jod=payment["amount_jod"],
            payment_date=payment["payment_date"],
            recorded_by=payment["recorded_by"],
            recorded_by_name=payment["recorded_by_name"],
            notes=payment["notes"],
            created_at=payment["created_at"]
        )

@api_router.get("/payments", response_model=List[PaymentResponse])
async def get_payments(patient_id: Optional[int] = None, current_user: dict = Depends(get_current_user)):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        
        query = """
            SELECT pm.*, p.name as patient_name, u.full_name as recorded_by_name
            FROM payments pm
            JOIN patients p ON pm.patient_id = p.id
            JOIN users u ON pm.recorded_by = u.id
            WHERE 1=1
        """
        params = []
        
        if patient_id is not None:
            query += " AND pm.patient_id = ?"
            params.append(patient_id)
        
        query += " ORDER BY pm.payment_date DESC"
        
        cursor = await db.execute(query, params)
        payments = await cursor.fetchall()
        
        return [PaymentResponse(
            id=pm["id"],
            patient_id=pm["patient_id"],
            patient_name=pm["patient_name"],
            amount_jod=pm["amount_jod"],
            payment_date=pm["payment_date"],
            recorded_by=pm["recorded_by"],
            recorded_by_name=pm["recorded_by_name"],
            notes=pm["notes"],
            created_at=pm["created_at"]
        ) for pm in payments]

# Medical image routes
@api_router.post("/images/upload")
async def upload_image(
    patient_id: int = Form(...),
    image_type: str = Form(...),
    description: str = Form(None),
    file: UploadFile = File(...),
    current_user: dict = Depends(require_role(["doctor", "admin"]))
):
    # Create patient directory
    patient_dir = UPLOADS_DIR / str(patient_id)
    patient_dir.mkdir(exist_ok=True)
    
    # Save file
    file_extension = file.filename.split(".")[-1]
    file_name = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}.{file_extension}"
    file_path = patient_dir / file_name
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Save to database
    relative_path = f"{patient_id}/{file_name}"
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "INSERT INTO medical_images (patient_id, uploaded_by, image_path, image_type, description, upload_date) VALUES (?, ?, ?, ?, ?, ?)",
            (patient_id, current_user["id"], relative_path, image_type, description, datetime.now().isoformat())
        )
        await db.commit()
        image_id = cursor.lastrowid
    
    return {"id": image_id, "image_path": relative_path}

@api_router.get("/images/{image_id}")
async def get_image(image_id: int, current_user: dict = Depends(get_current_user)):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM medical_images WHERE id = ?", (image_id,))
        image = await cursor.fetchone()
        
        if not image:
            raise HTTPException(status_code=404, detail="Image not found")
        
        file_path = UPLOADS_DIR / image["image_path"]
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Image file not found")
        
        return FileResponse(file_path)

@api_router.get("/images/patient/{patient_id}", response_model=List[ImageResponse])
async def get_patient_images(patient_id: int, current_user: dict = Depends(get_current_user)):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("""
            SELECT mi.*, p.name as patient_name, u.full_name as uploaded_by_name
            FROM medical_images mi
            JOIN patients p ON mi.patient_id = p.id
            JOIN users u ON mi.uploaded_by = u.id
            WHERE mi.patient_id = ?
            ORDER BY mi.upload_date DESC
        """, (patient_id,))
        images = await cursor.fetchall()
        
        return [ImageResponse(
            id=img["id"],
            patient_id=img["patient_id"],
            patient_name=img["patient_name"],
            uploaded_by=img["uploaded_by"],
            uploaded_by_name=img["uploaded_by_name"],
            image_path=img["image_path"],
            image_type=img["image_type"],
            description=img["description"],
            upload_date=img["upload_date"]
        ) for img in images]

@api_router.delete("/images/{image_id}")
async def delete_image(image_id: int, current_user: dict = Depends(require_role(["doctor", "admin"]))):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM medical_images WHERE id = ?", (image_id,))
        image = await cursor.fetchone()
        
        if not image:
            raise HTTPException(status_code=404, detail="Image not found")
        
        # Delete file
        file_path = UPLOADS_DIR / image["image_path"]
        if file_path.exists():
            file_path.unlink()
        
        # Delete from database
        await db.execute("DELETE FROM medical_images WHERE id = ?", (image_id,))
        await db.commit()
    
    return {"message": "Image deleted successfully"}

# Get doctors list
@api_router.get("/doctors", response_model=List[UserResponse])
async def get_doctors(current_user: dict = Depends(get_current_user)):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM users WHERE role = 'doctor' ORDER BY full_name")
        doctors = await cursor.fetchall()
        
        return [UserResponse(
            id=doc["id"],
            username=doc["username"],
            full_name=doc["full_name"],
            role=doc["role"],
            session_duration_hours=doc["session_duration_hours"],
            is_first_login=bool(doc["is_first_login"]),
            created_at=doc["created_at"]
        ) for doc in doctors]

# Include the router in the main app
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
    logger.info("Application shutting down")
