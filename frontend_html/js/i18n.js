// Translations
const translations = {
    en: {
        appName: "Experts Dental Clinic",
        login: {
            title: "Welcome Back",
            subtitle: "Sign in to access your dashboard",
            username: "Username",
            password: "Password",
            loginButton: "Sign In",
            changePassword: "Change Password",
            newPassword: "New Password",
            confirmPassword: "Confirm Password",
            updatePassword: "Update Password"
        },
        nav: {
            dashboard: "Dashboard",
            patients: "Patients",
            appointments: "Appointments",
            calendar: "Calendar",
            procedures: "Procedures",
            users: "Users",
            payments: "Payments",
            logout: "Logout",
            language: "Language"
        },
        common: {
            add: "Add",
            edit: "Edit",
            delete: "Delete",
            save: "Save",
            cancel: "Cancel",
            search: "Search",
            actions: "Actions",
            view: "View",
            close: "Close",
            submit: "Submit",
            loading: "Loading...",
            noData: "No data available",
            success: "Success",
            error: "Error",
            confirm: "Confirm",
            areYouSure: "Are you sure?"
        },
        patient: {
            title: "Patients",
            addPatient: "Add New Patient",
            editPatient: "Edit Patient",
            name: "Patient Name",
            phone: "Phone Number",
            email: "Email",
            dateOfBirth: "Date of Birth",
            address: "Address",
            medicalHistory: "Medical History",
            notes: "Notes",
            balance: "Balance",
            created: "Created",
            details: "Patient Details"
        },
        appointment: {
            title: "Appointments",
            addAppointment: "New Appointment",
            patient: "Patient",
            doctor: "Doctor",
            date: "Date",
            time: "Time",
            duration: "Duration (minutes)",
            status: "Status",
            notes: "Notes",
            scheduled: "Scheduled",
            completed: "Completed",
            cancelled: "Cancelled",
            today: "Today's Appointments"
        },
        procedure: {
            title: "Procedures",
            addProcedure: "Add Procedure",
            name: "Procedure Name",
            price: "Price (JOD)",
            description: "Description"
        },
        payment: {
            title: "Payments",
            addPayment: "Record Payment",
            amount: "Amount (JOD)",
            date: "Payment Date",
            notes: "Notes"
        },
        user: {
            title: "Users",
            addUser: "Add User",
            username: "Username",
            fullName: "Full Name",
            role: "Role",
            admin: "Admin",
            doctor: "Doctor",
            receptionist: "Receptionist"
        },
        dashboard: {
            welcome: "Welcome",
            totalPatients: "Total Patients",
            todayAppointments: "Today's Appointments",
            pendingPayments: "Pending Payments"
        }
    },
    ar: {
        appName: "عيادة خبراء الأسنان",
        login: {
            title: "مرحباً بعودتك",
            subtitle: "سجل الدخول للوصول إلى لوحة التحكم",
            username: "اسم المستخدم",
            password: "كلمة المرور",
            loginButton: "تسجيل الدخول",
            changePassword: "تغيير كلمة المرور",
            newPassword: "كلمة المرور الجديدة",
            confirmPassword: "تأكيد كلمة المرور",
            updatePassword: "تحديث كلمة المرور"
        },
        nav: {
            dashboard: "لوحة التحكم",
            patients: "المرضى",
            appointments: "المواعيد",
            calendar: "التقويم",
            procedures: "الإجراءات",
            users: "المستخدمين",
            payments: "المدفوعات",
            logout: "تسجيل الخروج",
            language: "اللغة"
        },
        common: {
            add: "إضافة",
            edit: "تعديل",
            delete: "حذف",
            save: "حفظ",
            cancel: "إلغاء",
            search: "بحث",
            actions: "الإجراءات",
            view: "عرض",
            close: "إغلاق",
            submit: "إرسال",
            loading: "جاري التحميل...",
            noData: "لا توجد بيانات متاحة",
            success: "نجح",
            error: "خطأ",
            confirm: "تأكيد",
            areYouSure: "هل أنت متأكد؟"
        },
        patient: {
            title: "المرضى",
            addPatient: "إضافة مريض جديد",
            editPatient: "تعديل بيانات المريض",
            name: "اسم المريض",
            phone: "رقم الهاتف",
            email: "البريد الإلكتروني",
            dateOfBirth: "تاريخ الميلاد",
            address: "العنوان",
            medicalHistory: "التاريخ الطبي",
            notes: "ملاحظات",
            balance: "الرصيد",
            created: "تاريخ الإنشاء",
            details: "تفاصيل المريض"
        },
        appointment: {
            title: "المواعيد",
            addAppointment: "موعد جديد",
            patient: "المريض",
            doctor: "الطبيب",
            date: "التاريخ",
            time: "الوقت",
            duration: "المدة (دقائق)",
            status: "الحالة",
            notes: "ملاحظات",
            scheduled: "مجدول",
            completed: "مكتمل",
            cancelled: "ملغي",
            today: "مواعيد اليوم"
        },
        procedure: {
            title: "الإجراءات",
            addProcedure: "إضافة إجراء",
            name: "اسم الإجراء",
            price: "السعر (دينار أردني)",
            description: "الوصف"
        },
        payment: {
            title: "المدفوعات",
            addPayment: "تسجيل دفعة",
            amount: "المبلغ (دينار أردني)",
            date: "تاريخ الدفع",
            notes: "ملاحظات"
        },
        user: {
            title: "المستخدمين",
            addUser: "إضافة مستخدم",
            username: "اسم المستخدم",
            fullName: "الاسم الكامل",
            role: "الدور",
            admin: "مدير",
            doctor: "طبيب",
            receptionist: "موظف استقبال"
        },
        dashboard: {
            welcome: "مرحباً",
            totalPatients: "إجمالي المرضى",
            todayAppointments: "مواعيد اليوم",
            pendingPayments: "المدفوعات المعلقة"
        }
    }
};

class I18n {
    constructor() {
        this.currentLang = localStorage.getItem('language') || 'en';
        this.updateDirection();
    }

    t(key) {
        const keys = key.split('.');
        let value = translations[this.currentLang];
        
        for (const k of keys) {
            value = value?.[k];
        }
        
        return value || key;
    }

    setLanguage(lang) {
        this.currentLang = lang;
        localStorage.setItem('language', lang);
        this.updateDirection();
    }

    getLanguage() {
        return this.currentLang;
    }

    updateDirection() {
        const html = document.documentElement;
        html.setAttribute('lang', this.currentLang);
        html.setAttribute('dir', this.currentLang === 'ar' ? 'rtl' : 'ltr');
    }
}

const i18n = new I18n();
