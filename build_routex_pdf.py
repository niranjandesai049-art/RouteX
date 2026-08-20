import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_number(self, page_count):
        if self._pageNumber == 1:
            return  # Suppress headers/footers on cover page
        
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#475569"))
        
        # Header
        self.drawString(36, 11 * 72 - 25, "RouteX India — Technical Architecture & System Specification")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(36, 11 * 72 - 30, 8.5 * 72 - 36, 11 * 72 - 30)
        
        # Footer
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(8.5 * 72 - 36, 25, page_str)
        self.drawString(36, 25, "CONFIDENTIAL & PROPRIETARY — ROUTEX LOGISTICS INDIA")
        self.line(36, 35, 8.5 * 72 - 36, 35)
        
        self.restoreState()

def build_pdf(filename="RouteX_India_Complete_System_Specification.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=45,
        bottomMargin=45
    )

    styles = getSampleStyleSheet()
    
    # Custom Palette Colors
    PRIMARY = colors.HexColor("#0F172A")    # Dark Slate Navy
    SECONDARY = colors.HexColor("#2563EB")  # Electric Royal Blue
    ACCENT = colors.HexColor("#059669")     # Emerald Green
    TEXT_DARK = colors.HexColor("#1E293B")  # Charcoal Text
    TEXT_MUTED = colors.HexColor("#64748B") # Muted Gray Text
    BG_LIGHT = colors.HexColor("#F8FAFC")   # Light Gray Table/Card BG
    BORDER_COLOR = colors.HexColor("#E2E8F0")

    # Typography Styles
    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=28,
        leading=34,
        textColor=PRIMARY,
        alignment=0, # Left-aligned
        spaceAfter=10
    )

    subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=14,
        leading=18,
        textColor=SECONDARY,
        spaceAfter=20
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=PRIMARY,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=SECONDARY,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12.5,
        textColor=TEXT_DARK,
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=body_style,
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=3
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white,
        alignment=0
    )

    table_body_style = ParagraphStyle(
        'TableBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10.5,
        textColor=TEXT_DARK
    )

    code_style = ParagraphStyle(
        'CodeBlock',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        leading=10.5,
        textColor=PRIMARY,
        backColor=BG_LIGHT,
        borderColor=BORDER_COLOR,
        borderWidth=0.5,
        borderPadding=6,
        spaceBefore=4,
        spaceAfter=6
    )

    story = []

    # ---------------------------------------------------------
    # COVER PAGE
    # ---------------------------------------------------------
    story.append(Spacer(1, 40))
    story.append(Paragraph("RouteX India", title_style))
    story.append(Paragraph("AI-Powered Digital Freight Marketplace & Intelligent Fleet Management System", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=3, color=SECONDARY, spaceBefore=0, spaceAfter=20))
    
    story.append(Paragraph("<b>Comprehensive Technical Architecture & System Specification Report</b>", ParagraphStyle('CoverDocType', parent=body_style, fontSize=11, leading=15, textColor=PRIMARY)))
    story.append(Spacer(1, 15))
    
    meta_text = """
    <b>Document Version:</b> 2.0 (Verified Monorepo Audit)<br/>
    <b>Primary Target OS:</b> Linux / Windows / Cloud Kubernetes Environment<br/>
    <b>Backend Core:</b> NestJS 11 + Prisma ORM 5 + PostgreSQL (Supabase)<br/>
    <b>Frontend Web:</b> Next.js 16 (App Router) + React 19 + Tailwind CSS v4<br/>
    <b>Mobile Apps:</b> React Native & Expo (Android)<br/>
    <b>AI Engine:</b> Groq Cloud SDK (Llama 3.3 70B Versatile)<br/>
    <b>GIS & Telemetry:</b> Leaflet, OSRM Routing, Socket.IO WebSockets<br/>
    <b>Author / Owner:</b> RouteX Engineering & Product Team<br/>
    <b>Date:</b> August 2026
    """
    story.append(Paragraph(meta_text, ParagraphStyle('CoverMeta', parent=body_style, fontSize=9.5, leading=14, textColor=TEXT_MUTED)))
    story.append(Spacer(1, 40))
    
    # Executive Summary Card on Cover
    exec_summary = """
    <b>EXECUTIVE SUMMARY:</b><br/>
    RouteX India is an enterprise digital freight platform designed to automate commercial road transportation across India. It solves key logistics challenges—opaque broker pricing, manual phone dispatch, lack of shipment visibility, and paper POD delays—by combining real-time OSRM GIS routing, Groq Llama 3.3 dynamic freight pricing, Socket.IO live GPS telemetry, multi-stop delivery management, electronic Proof of Delivery (ePOD), and automated digital wallet escrow settlements.
    """
    story.append(Table([[Paragraph(exec_summary, ParagraphStyle('ExecSummaryText', parent=body_style, fontSize=9, leading=13, textColor=PRIMARY))]],
                       colWidths=[540],
                       style=TableStyle([
                           ('BACKGROUND', (0,0), (-1,-1), BG_LIGHT),
                           ('BOX', (0,0), (-1,-1), 1, SECONDARY),
                           ('PADDING', (0,0), (-1,-1), 12),
                       ])))
    
    story.append(PageBreak())

    # ---------------------------------------------------------
    # SECTION 1: SYSTEM OVERVIEW & BUSINESS ARCHITECTURE
    # ---------------------------------------------------------
    story.append(Paragraph("1. ROUTEX — SYSTEM OVERVIEW & BUSINESS ARCHITECTURE", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceBefore=2, spaceAfter=8))
    
    story.append(Paragraph("<b>1.1 Core Mission & Industry Context</b>", h2_style))
    story.append(Paragraph(
        "RouteX India addresses systemic inefficiencies in the Indian road logistics sector. By digitizing freight transactions between Shippers, Transporters (Fleet Owners), and Drivers, RouteX replaces manual broker phone calls with automated algorithmic matching, real-time GIS route calculation, and instant digital payments.",
        body_style
    ))
    
    story.append(Paragraph("<b>1.2 Target User Personas & Ecosystem</b>", h2_style))
    story.append(Paragraph("• <b>Shippers (Companies & Individuals):</b> Book commercial freight, receive instant AI pricing quotes, monitor live GPS movement, and receive verified digital PODs.", bullet_style))
    story.append(Paragraph("• <b>Transporters (Fleet Owners):</b> Manage vehicle fleets, assign drivers to loads, monitor maintenance/fuel/tyres, and receive automated wallet settlements.", bullet_style))
    story.append(Paragraph("• <b>Drivers (Owner-Operators & Employees):</b> Receive load dispatch alerts via mobile app, stream live GPS telemetry, execute multi-stop deliveries, and capture digital signatures.", bullet_style))
    story.append(Paragraph("• <b>Super Admins:</b> Monitor national freight dispatch, review AI pricing telemetry, verify user credentials, and resolve platform disputes.", bullet_style))

    story.append(Spacer(1, 8))

    # ---------------------------------------------------------
    # SECTION 2: REPOSITORY TOPOLOGY
    # ---------------------------------------------------------
    story.append(Paragraph("2. REPOSITORY TOPOLOGY & APPS SPECIFICATION", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceBefore=2, spaceAfter=8))
    
    app_table_data = [
        [Paragraph("Application", table_header_style), Paragraph("Directory", table_header_style), Paragraph("Tech Stack", table_header_style), Paragraph("Role & Core Responsibility", table_header_style)],
        [Paragraph("<b>routex-backend</b>", table_body_style), Paragraph("routex-backend/", table_body_style), Paragraph("NestJS 11, Prisma 5, PostgreSQL, Winston, Socket.IO", table_body_style), Paragraph("Core REST API engine, Groq AI pricing, WebSocket tracking, Razorpay gateway, FCM notifications.", table_body_style)],
        [Paragraph("<b>routex-web</b>", table_body_style), Paragraph("routex-web/", table_body_style), Paragraph("Next.js 16 (App Router), React 19, Tailwind CSS v4, Leaflet", table_body_style), Paragraph("Multi-role web portal for Shippers, Fleet Owners, and Super Admins.", table_body_style)],
        [Paragraph("<b>routex-driver</b>", table_body_style), Paragraph("routex-driver/", table_body_style), Paragraph("React Native, Expo, Android SDK", table_body_style), Paragraph("Driver mobile app for load acceptance, live GPS streaming, and ePOD upload.", table_body_style)],
        [Paragraph("<b>routex-mobile</b>", table_body_style), Paragraph("routex-mobile/", table_body_style), Paragraph("React Native, Expo", table_body_style), Paragraph("Customer mobile application for booking and tracking on mobile devices.", table_body_style)],
        [Paragraph("<b>Infrastructure</b>", table_body_style), Paragraph("Root (/), k8s/", table_body_style), Paragraph("Docker Compose, Kubernetes, Nginx", table_body_style), Paragraph("Production container orchestration, SSL proxying, and load balancing.", table_body_style)]
    ]
    
    t_apps = Table(app_table_data, colWidths=[90, 85, 135, 230])
    t_apps.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_apps)
    story.append(Spacer(1, 10))

    # ---------------------------------------------------------
    # SECTION 3: CUSTOM AUTHENTICATION & SECURITY
    # ---------------------------------------------------------
    story.append(Paragraph("3. CUSTOM AUTHENTICATION & SESSION ARCHITECTURE", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceBefore=2, spaceAfter=8))
    
    auth_desc = """
    RouteX utilizes a <b>production-ready custom authentication engine</b> fully decoupled from third-party auth vendors like Clerk.<br/>
    • <b>Primary Method:</b> Phone Number + 6-Digit OTP SMS.<br/>
    • <b>Phone Normalization:</b> Normalizes Indian mobile numbers (e.g. <code>9876543210</code>, <code>+91 9876543210</code>) to standard E.164 (<code>+919876543210</code>) using strict regex validation <code>/^\\+91[6-9]\\d{9}$/</code>.<br/>
    • <b>Security Controls:</b> SHA-256 OTP hashing (plain text OTP is never persisted in database), 5-minute strict expiry, 60-second resend cooldown, max 3 verification attempts per OTP code, and immediate single-use invalidation (<code>verified_at</code>).<br/>
    • <b>Token Rotation Engine:</b> Issues 7-day JWT access tokens and 30-day SHA-256 hashed refresh tokens stored in the <code>auth_sessions</code> database table. Endpoint <code>POST /api/auth/refresh</code> performs token rotation.<br/>
    • <b>Multi-Provider Abstraction (<code>ISmsProvider</code>):</b> Supports Fast2SMS (Indian OTP gateway), Twilio (Global SMS), MSG91 (Enterprise India), and Console Mock Provider (development mode logging).
    """
    story.append(Paragraph(auth_desc, body_style))
    story.append(Spacer(1, 8))

    # ---------------------------------------------------------
    # SECTION 4: AI PRICING ENGINE & GROQ LLM INTEGRATION
    # ---------------------------------------------------------
    story.append(Paragraph("4. AI DYNAMIC PRICING ENGINE & GROQ LLM INTEGRATION", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceBefore=2, spaceAfter=8))
    
    ai_desc = """
    Freight rate calculation is powered by an advanced dual-engine system located in <code>routex-backend/src/ai/pricing.service.ts</code>:<br/>
    1. <b>Groq LLM Engine:</b> Queries Groq Cloud SDK using the <code>llama-3.3-70b-versatile</code> model. The service supplies distance, tonnage, truck class, fuel pricing, weather conditions, and traffic level, instructing the LLM to output a strictly formatted JSON object containing estimated price, confidence score, and cost breakdown.<br/>
    2. <b>Deterministic Local Rule Engine:</b> If Groq API key is unconfigured or network failure occurs, the service automatically fails over to a local formula engine calculating:
    """
    story.append(Paragraph(ai_desc, body_style))
    
    formula_code = "Price = BasePrice + (Distance_Km * PerKmRate) * WeightFactor * WeatherSurcharge * TrafficSurcharge + TollEstimate"
    story.append(Paragraph(formula_code, code_style))
    story.append(Spacer(1, 8))

    # ---------------------------------------------------------
    # SECTION 5: LIVE GPS TRACKING & WEBSOCKET ENGINE
    # ---------------------------------------------------------
    story.append(Paragraph("5. LIVE GPS TRACKING & SOCKET.IO WEBSOCKET ENGINE", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceBefore=2, spaceAfter=8))
    
    socket_table_data = [
        [Paragraph("Event Name", table_header_style), Paragraph("Sender", table_header_style), Paragraph("Target Room", table_header_style), Paragraph("Payload Data Structure", table_header_style), Paragraph("Functional Purpose", table_header_style)],
        [Paragraph("<code>driver:join</code>", table_body_style), Paragraph("Driver App", table_body_style), Paragraph("Server", table_body_style), Paragraph("<code>{ driverId }</code>", table_body_style), Paragraph("Registers driver socket mapping for targeted dispatching.", table_body_style)],
        [Paragraph("<code>shipper:join</code>", table_body_style), Paragraph("Shipper Web", table_body_style), Paragraph("Server", table_body_style), Paragraph("<code>{ bookingId }</code>", table_body_style), Paragraph("Subscribes shipper socket to live tracking room for a trip.", table_body_style)],
        [Paragraph("<code>driver:locationUpdate</code>", table_body_style), Paragraph("Driver App", table_body_style), Paragraph("Shipper, Fleet, Admin", table_body_style), Paragraph("<code>{ driverId, bookingId, latitude, longitude, speed, heading }</code>", table_body_style), Paragraph("Streams real-time GPS telemetry to animate map markers.", table_body_style)],
        [Paragraph("<code>booking:delay_detected</code>", table_body_style), Paragraph("Server", table_body_style), Paragraph("Shipper, Admin", table_body_style), Paragraph("<code>{ bookingId, stopOrder, durationMinutes, message }</code>", table_body_style), Paragraph("Emits alert when vehicle stays stationary > 15 mins.", table_body_style)],
        [Paragraph("<code>booking:completed</code>", table_body_style), Paragraph("Server", table_body_style), Paragraph("Shipper, Fleet", table_body_style), Paragraph("<code>{ bookingId, status: 'completed' }</code>", table_body_style), Paragraph("Triggers trip completion and releases wallet funds.", table_body_style)]
    ]
    
    t_sockets = Table(socket_table_data, colWidths=[100, 65, 75, 140, 160])
    t_sockets.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_sockets)
    story.append(Spacer(1, 10))

    story.append(PageBreak())

    # ---------------------------------------------------------
    # SECTION 6: BUTTON & ACTION INVENTORY TABLE
    # ---------------------------------------------------------
    story.append(Paragraph("6. COMPLETE BUTTON & ACTION INVENTORY", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceBefore=2, spaceAfter=8))
    
    btn_table_data = [
        [Paragraph("Button Name", table_header_style), Paragraph("Location / Screen", table_header_style), Paragraph("Role", table_header_style), Paragraph("API Endpoint Called", table_header_style), Paragraph("Backend & Database Effect", table_header_style)],
        [Paragraph("<b>Send Verification OTP</b>", table_body_style), Paragraph("/login, /register", table_body_style), Paragraph("Public", table_body_style), Paragraph("<code>POST /api/auth/phone/send-otp</code>", table_body_style), Paragraph("Generates 6-digit OTP, stores SHA-256 hash in <code>phone_verifications</code>, sends SMS.", table_body_style)],
        [Paragraph("<b>Verify OTP & Access</b>", table_body_style), Paragraph("/login, /register", table_body_style), Paragraph("Public", table_body_style), Paragraph("<code>POST /api/auth/phone/verify-otp</code>", table_body_style), Paragraph("Validates OTP hash, creates user/profile, issues JWT session token.", table_body_style)],
        [Paragraph("<b>Calculate Instant Rate</b>", table_body_style), Paragraph("/shipper/book", table_body_style), Paragraph("Shipper", table_body_style), Paragraph("<code>POST /api/ai/pricing</code>", table_body_style), Paragraph("Queries OSRM GIS distance and Groq Llama 3.3 LLM for pricing breakdown.", table_body_style)],
        [Paragraph("<b>Confirm & Book Truck</b>", table_body_style), Paragraph("/shipper/book", table_body_style), Paragraph("Shipper", table_body_style), Paragraph("<code>POST /api/bookings</code>", table_body_style), Paragraph("Inserts <code>Booking</code> + <code>booking_stops</code>, emits Socket & FCM alerts.", table_body_style)],
        [Paragraph("<b>Accept Load</b>", table_body_style), Paragraph("Driver App", table_body_style), Paragraph("Driver", table_body_style), Paragraph("<code>POST /api/bookings/:id/accept</code>", table_body_style), Paragraph("Assigns driver to booking, updates status to <code>assigned</code>.", table_body_style)],
        [Paragraph("<b>Arrived at Pickup</b>", table_body_style), Paragraph("Driver App", table_body_style), Paragraph("Driver", table_body_style), Paragraph("<code>PUT /api/bookings/:id/status</code>", table_body_style), Paragraph("Updates status to <code>at_pickup</code>, broadcasts socket status update.", table_body_style)],
        [Paragraph("<b>Start Trip</b>", table_body_style), Paragraph("Driver App", table_body_style), Paragraph("Driver", table_body_style), Paragraph("<code>PUT /api/bookings/:id/status</code>", table_body_style), Paragraph("Updates status to <code>in_transit</code>, initiates live GPS streaming.", table_body_style)],
        [Paragraph("<b>Submit ePOD & Complete</b>", table_body_style), Paragraph("Driver App", table_body_style), Paragraph("Driver", table_body_style), Paragraph("<code>POST /api/bookings/:id/epod</code>", table_body_style), Paragraph("Stores signature/photo URL, completes trip, transfers wallet funds.", table_body_style)],
        [Paragraph("<b>Add Truck</b>", table_body_style), Paragraph("/fleet/vehicles", table_body_style), Paragraph("Transporter", table_body_style), Paragraph("<code>POST /api/fleet/trucks</code>", table_body_style), Paragraph("Inserts new record into <code>trucks</code> table under company ID.", table_body_style)],
        [Paragraph("<b>Assign Driver</b>", table_body_style), Paragraph("/fleet/dispatch", table_body_style), Paragraph("Transporter", table_body_style), Paragraph("<code>POST /api/fleet/assign-driver</code>", table_body_style), Paragraph("Pairs <code>driver_id</code> to <code>trucks.driver_id</code>.", table_body_style)],
        [Paragraph("<b>Request Payout</b>", table_body_style), Paragraph("/fleet/wallet", table_body_style), Paragraph("Transporter", table_body_style), Paragraph("<code>POST /api/fleet/wallet/payout</code>", table_body_style), Paragraph("Deducts wallet balance, inserts bank transfer payout transaction.", table_body_style)]
    ]
    
    t_btns = Table(btn_table_data, colWidths=[95, 80, 55, 140, 170])
    t_btns.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
        ('PADDING', (0,0), (-1,-1), 4.5),
    ]))
    story.append(t_btns)
    story.append(Spacer(1, 10))

    # ---------------------------------------------------------
    # SECTION 7: DATABASE SCHEMA & ENTITY MODEL
    # ---------------------------------------------------------
    story.append(Paragraph("7. DATABASE SCHEMA & ENTITY MODEL (PRISMA / SUPABASE)", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceBefore=2, spaceAfter=8))
    
    db_table_data = [
        [Paragraph("Model / Table", table_header_style), Paragraph("Primary Key", table_header_style), Paragraph("Key Foreign Keys", table_header_style), Paragraph("Purpose & Business Meaning", table_header_style)],
        [Paragraph("<code>users</code> & <code>profiles</code>", table_body_style), Paragraph("<code>id</code> (UUID)", table_body_style), Paragraph("<code>id</code> $\\rightarrow$ <code>users.id</code>", table_body_style), Paragraph("User identity, name, role (<code>shipper</code>, <code>fleet_owner</code>, <code>driver</code>, <code>super_admin</code>), phone.", table_body_style)],
        [Paragraph("<code>phone_verifications</code>", table_body_style), Paragraph("<code>id</code> (UUID)", table_body_style), Paragraph("N/A", table_body_style), Paragraph("Stores SHA-256 hashed 6-digit OTPs, attempts, 5m expiry, 60s resend cooldown.", table_body_style)],
        [Paragraph("<code>auth_sessions</code>", table_body_style), Paragraph("<code>id</code> (UUID)", table_body_style), Paragraph("<code>user_id</code>", table_body_style), Paragraph("Tracks active JWT refresh token hashes, device IDs, and revocation status.", table_body_style)],
        [Paragraph("<code>Booking</code>", table_body_style), Paragraph("<code>id</code> (UUID)", table_body_style), Paragraph("<code>shipper_id</code>, <code>driver_id</code>, <code>truck_id</code>", table_body_style), Paragraph("Freight order record, status state machine, quoted price, signature URLs.", table_body_style)],
        [Paragraph("<code>booking_stops</code>", table_body_style), Paragraph("<code>id</code> (UUID)", table_body_style), Paragraph("<code>booking_id</code>", table_body_style), Paragraph("Multi-stop waypoints, sequence order, lat/lng, per-stop ePOD signature.", table_body_style)],
        [Paragraph("<code>trucks</code> & <code>drivers</code>", table_body_style), Paragraph("<code>id</code> (UUID)", table_body_style), Paragraph("<code>company_id</code>, <code>driver_id</code>", table_body_style), Paragraph("Commercial vehicle fleet registry, driver license verification, and availability.", table_body_style)],
        [Paragraph("<code>wallets</code> & <code>transactions</code>", table_body_style), Paragraph("<code>id</code> (UUID)", table_body_style), Paragraph("<code>profile_id</code>", table_body_style), Paragraph("Double-entry digital wallet ledger for deposits, escrow holds, earnings, and payouts.", table_body_style)],
        [Paragraph("<code>push_tokens</code>", table_body_style), Paragraph("<code>id</code> (UUID)", table_body_style), Paragraph("<code>user_id</code>", table_body_style), Paragraph("FCM device push tokens for multi-platform notifications (android, ios, web).", table_body_style)]
    ]
    
    t_db = Table(db_table_data, colWidths=[110, 65, 115, 250])
    t_db.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
        ('PADDING', (0,0), (-1,-1), 4.5),
    ]))
    story.append(t_db)
    story.append(Spacer(1, 10))

    story.append(PageBreak())

    # ---------------------------------------------------------
    # SECTION 8: SECOND-PASS VERIFIED TRUTH TABLE
    # ---------------------------------------------------------
    story.append(Paragraph("8. SECOND-PASS VERIFIED CODEBASE TRUTH TABLE", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceBefore=2, spaceAfter=8))
    
    truth_desc = """
    The following truth table represents the verified code-level audit of all major RouteX platform capabilities:
    """
    story.append(Paragraph(truth_desc, body_style))
    
    truth_table_data = [
        [Paragraph("Feature / Capability", table_header_style), Paragraph("Status Classification", table_header_style), Paragraph("Implementation Source File", table_header_style), Paragraph("API / Gateway Route", table_header_style), Paragraph("Technical Audit Notes", table_header_style)],
        [Paragraph("<b>Phone OTP Auth</b>", table_body_style), Paragraph("✅ FULLY IMPLEMENTED", table_body_style), Paragraph("<code>src/auth/sms.service.ts</code>", table_body_style), Paragraph("<code>POST /api/auth/phone/send-otp</code>", table_body_style), Paragraph("SHA-256 hashed OTPs, 60s cooldown, 5m expiry.", table_body_style)],
        [Paragraph("<b>Token Rotation Sessions</b>", table_body_style), Paragraph("✅ FULLY IMPLEMENTED", table_body_style), Paragraph("<code>src/auth/auth.service.ts</code>", table_body_style), Paragraph("<code>POST /api/auth/refresh</code>", table_body_style), Paragraph("Stores refresh hashes in <code>auth_sessions</code> table.", table_body_style)],
        [Paragraph("<b>Multi-Role RBAC</b>", table_body_style), Paragraph("✅ FULLY IMPLEMENTED", table_body_style), Paragraph("<code>src/auth/roles.guard.ts</code>", table_body_style), Paragraph("Guard <code>@Roles()</code>", table_body_style), Paragraph("Enforces <code>shipper</code>, <code>fleet_owner</code>, <code>driver</code>, <code>admin</code>.", table_body_style)],
        [Paragraph("<b>AI Freight Pricing</b>", table_body_style), Paragraph("✅ FULLY IMPLEMENTED", table_body_style), Paragraph("<code>src/ai/pricing.service.ts</code>", table_body_style), Paragraph("<code>POST /api/ai/pricing</code>", table_body_style), Paragraph("Groq SDK (Llama 3.3 70B) + local formula fallback.", table_body_style)],
        [Paragraph("<b>AI Route Optimization</b>", table_body_style), Paragraph("🔵 MOCK / PLACEHOLDER", table_body_style), Paragraph("<code>src/map/map.service.ts</code>", table_body_style), Paragraph("<code>GET /api/map/route</code>", table_body_style), Paragraph("Uses OSRM GIS engine, NOT an AI LLM model.", table_body_style)],
        [Paragraph("<b>AI Fuel Optimization</b>", table_body_style), Paragraph("🔵 MOCK / PLACEHOLDER", table_body_style), Paragraph("<code>src/fleet/fleet.service.ts</code>", table_body_style), Paragraph("<code>GET /api/fleet/fuel</code>", table_body_style), Paragraph("Manual fuel logs CRUD, no predictive ML model.", table_body_style)],
        [Paragraph("<b>AI Driver Matching</b>", table_body_style), Paragraph("🔵 MOCK / PLACEHOLDER", table_body_style), Paragraph("<code>src/booking/booking.service.ts</code>", table_body_style), Paragraph("<code>POST /api/bookings/:id/accept</code>", table_body_style), Paragraph("Broadcast dispatch + first-accept, no ML ranker.", table_body_style)],
        [Paragraph("<b>Priority Logistics</b>", table_body_style), Paragraph("✅ FULLY IMPLEMENTED", table_body_style), Paragraph("<code>src/booking/booking.service.ts</code>", table_body_style), Paragraph("<code>POST /api/bookings</code>", table_body_style), Paragraph("Priority FCM alerts, surge rate, 15m delay monitoring.", table_body_style)],
        [Paragraph("<b>Multi-Stop Waypoints</b>", table_body_style), Paragraph("✅ FULLY IMPLEMENTED", table_body_style), Paragraph("<code>src/booking/booking.service.ts</code>", table_body_style), Paragraph("<code>POST /api/bookings</code>", table_body_style), Paragraph("Sequence order, stop arrival, per-stop ePOD.", table_body_style)],
        [Paragraph("<b>ePOD Verification</b>", table_body_style), Paragraph("✅ FULLY IMPLEMENTED", table_body_style), Paragraph("<code>src/booking/booking.service.ts</code>", table_body_style), Paragraph("<code>POST /api/bookings/:id/epod</code>", table_body_style), Paragraph("Stores digital signature & photo URLs.", table_body_style)],
        [Paragraph("<b>Razorpay Integration</b>", table_body_style), Paragraph("✅ FULLY IMPLEMENTED", table_body_style), Paragraph("<code>src/payments/payments.service.ts</code>", table_body_style), Paragraph("<code>POST /api/payments/create-order</code>", table_body_style), Paragraph("HMAC SHA-256 signature verification, refunds.", table_body_style)],
        [Paragraph("<b>Digital Wallet Ledger</b>", table_body_style), Paragraph("✅ FULLY IMPLEMENTED", table_body_style), Paragraph("<code>src/wallet/wallet.service.ts</code>", table_body_style), Paragraph("<code>GET /api/wallet/balance</code>", table_body_style), Paragraph("Double-entry ledger for deposits, escrow, payouts.", table_body_style)],
        [Paragraph("<b>Driver GPS & Socket.IO</b>", table_body_style), Paragraph("✅ FULLY IMPLEMENTED", table_body_style), Paragraph("<code>src/tracking/tracking.gateway.ts</code>", table_body_style), Paragraph("Socket <code>driver:locationUpdate</code>", table_body_style), Paragraph("Live room broadcasting & stationary delay alerts.", table_body_style)],
        [Paragraph("<b>FCM Notifications</b>", table_body_style), Paragraph("✅ FULLY IMPLEMENTED", table_body_style), Paragraph("<code>src/notifications/...</code>", table_body_style), Paragraph("<code>POST /api/auth/push-token</code>", table_body_style), Paragraph("Firebase Admin SDK multi-device messaging.", table_body_style)],
        [Paragraph("<b>Fleet Asset Management</b>", table_body_style), Paragraph("✅ FULLY IMPLEMENTED", table_body_style), Paragraph("<code>src/fleet/fleet.service.ts</code>", table_body_style), Paragraph("<code>GET /api/fleet/trucks</code>", table_body_style), Paragraph("Vehicle, driver, maintenance, fuel, & tyre CRUD.", table_body_style)]
    ]
    
    t_truth = Table(truth_table_data, colWidths=[90, 85, 110, 125, 130])
    t_truth.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
        ('PADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_truth)
    story.append(Spacer(1, 15))
    
    story.append(Paragraph("<b>End of Official RouteX Technical Specification Document.</b>", ParagraphStyle('EndDoc', parent=body_style, fontSize=9, alignment=1, textColor=TEXT_MUTED)))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF Successfully generated at: {os.path.abspath(filename)}")

if __name__ == "__main__":
    build_pdf()
