# Privacy Policy

**Last updated:** June 16, 2026

## 1. Introduction

This Privacy Policy describes how Yemen Telecom SIM Management System ("we", "our", or "the Application") collects, uses, and protects user data. By using the Application, you agree to the practices described in this policy.

## 2. Data We Collect

### 2.1 Personal Information
- **Full Name**: Collected during user registration and SIM activation via OCR or manual entry.
- **National ID Number**: Collected for identity verification during SIM activation.
- **Phone Number**: Collected for SIM registration and user account contact.
- **Username and Password**: Used for authentication. Passwords are stored as bcrypt hashes.

### 2.2 Identity Documents
- **ID Card Images**: Temporarily captured via camera for OCR processing. Images are processed locally and are not stored permanently.

### 2.3 SIM Data
- **ICCID**: International Circuit Card Identifier for SIM management.
- **Provider Information**: Mobile network operator details.
- **SIM Status**: Activation status and assignment history.

### 2.4 Usage Data
- **Login History**: Last login timestamp for audit purposes.
- **Operations Log**: Actions performed within the Application for security auditing.

## 3. How We Use Your Data

- **Identity Verification**: To comply with telecommunications regulations and prevent fraud.
- **SIM Management**: To manage SIM inventory, activation, and distribution.
- **Account Management**: To provide user authentication and role-based access control.
- **Security Auditing**: To detect and prevent duplicate identities and suspicious activities.
- **System Administration**: To manage application settings and user roles.

## 4. Data Storage and Security

### 4.1 Storage
- Data is stored on secure PostgreSQL databases (Supabase).
- Profile images are stored in Firebase Storage.
- All data is stored on servers with restricted access.

### 4.2 Security Measures
- **Encryption in Transit**: All data transmitted between the Application and servers uses HTTPS/TLS 1.3.
- **Encryption at Rest**: Data is encrypted at rest on database servers.
- **Authentication**: JWT-based authentication with token blacklisting.
- **Authorization**: Role-based access control (Manager, Agent, Seller).
- **CSRF Protection**: Cross-Site Request Forgery protection on all state-changing operations.
- **Rate Limiting**: Protection against brute-force and denial-of-service attacks.
- **Input Validation**: All user inputs are validated and sanitized against XSS attacks.

## 5. Data Sharing

- We do **not** sell, trade, or share personal data with third parties.
- Data is only accessible to authorized users within the Application based on their role.
- Firebase (Google) is used for image storage and is subject to Google's Privacy Policy.
- Supabase is used for database hosting and is subject to Supabase's Privacy Policy.

## 6. Data Retention

- **Customer Records**: Retained for the duration required by telecommunications regulations.
- **OCR Images**: Deleted immediately after text extraction is complete.
- **Audit Logs**: Retained for security and compliance purposes.
- **User Accounts**: Retained until the user requests deletion.

## 7. Your Rights

### 7.1 Account Deletion
You can delete your account and associated data directly from within the Application:
1. Navigate to your Account/Profile settings.
2. Click "Delete Account" and confirm.
3. All associated data will be permanently removed.

### 7.2 Data Access and Correction
Users with appropriate roles can view and update their profile information within the Application.

### 7.3 Data Portability
You may request a copy of your data by contacting your system administrator.

## 8. Children's Privacy

The Application is not intended for use by individuals under the age of 18. We do not knowingly collect data from children.

## 9. Changes to This Policy

We may update this Privacy Policy from time to time. Users will be notified of material changes through the Application.

## 10. Contact

For privacy-related inquiries, please contact your system administrator or the designated data protection officer.
