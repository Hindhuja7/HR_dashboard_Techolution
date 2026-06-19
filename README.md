# HR Automation Dashboard

## Overview

HR Automation Dashboard is a workforce intelligence and HR operations platform built using **Google Sheets**, **Google Apps Script**, and **HtmlService**.

The solution automates employee monitoring, workforce analytics, alerting, reporting, and organizational visibility across India and US teams through both a Google Sheets dashboard and a browser-based web application.

---

## Features

### Employee Management

* India Employee Database
* US Employee Database
* Dynamic employee tracking
* Department-wise workforce analysis
* Region-wise reporting

### Dashboard Analytics

* Total Employees
* India Headcount
* US Headcount
* Confirmed Employees
* Employees Under Probation
* Intern Count
* High Risk Cases
* Productivity Flags
* Alert Monitoring

### Alerts & Notifications

* Intern Last Working Day (LWD) Alerts
* Probation Confirmation Alerts
* Automated Email Digest
* Configurable alert thresholds

### Risk Monitoring

* Employee risk tracking
* Risk categorization
* Mitigation action monitoring
* Risk register reporting

### Organizational Structure

* Dynamic Org Chart generation
* Reporting hierarchy visualization
* Manager-to-employee relationships
* Automatic hierarchy updates

### Employee Drill-Down

Filter employees by:

* Region
* Department
* Reporting Manager
* Employment Status

### Productivity Monitoring

* Employee productivity tracking
* Below-target productivity alerts
* Workforce performance visibility

---

## Real-Time Reflection

The system supports real-time reflection across both the Google Sheets dashboard and the deployed web application.

### Sheet Dashboard

When HR updates source data:

* Adds an employee
* Updates employee status
* Modifies risk records
* Updates productivity data
* Adds offboarded resources

Installable triggers automatically rebuild the dashboard, org chart, drill-down view, and alert sections.

### Web Application

The web application automatically refreshes every **1500 milliseconds (1.5 seconds)** using client-side polling.

This ensures that newly added or modified records are automatically reflected without requiring users to manually refresh the page.

For larger updates, synchronization may take a few additional seconds depending on Google Apps Script execution time and Google Sheets processing latency. All update activities are captured in the Logs tab for monitoring and traceability.

---

## Architecture

Google Sheets
│
├── India Employee Database
├── US Employee Database
├── RM Data
├── Finance
├── Productivity
├── Risk Report
├── Offboarded Resources
├── Dashboard
├── OrgChart
├── DrillDown
├── Logs
├── Changelog
└── _Config
│
▼

Google Apps Script
│
├── DataLayer.gs
├── Dashboard.gs
├── Alerts.gs
├── OrgChart.gs
├── DrillDown.gs
├── Triggers.gs
├── Config.gs
├── Logs.gs
└── WebApp.gs
│
▼

Outputs
│
├── Dashboard Tab
├── OrgChart Tab
├── DrillDown Tab
├── Email Alerts
└── Web Dashboard

---

## Core Components

### DataLayer.gs

* Data loading
* Header normalization
* Dynamic column mapping
* Cache management

### Dashboard.gs

* KPI generation
* Department analytics
* Risk reporting
* Productivity reporting

### Alerts.gs

* LWD alert calculation
* Probation alert calculation
* Email digest generation

### OrgChart.gs

* Dynamic hierarchy generation
* Reporting structure visualization

### DrillDown.gs

* Interactive employee filtering
* Department-level exploration

### Triggers.gs

* Real-time updates
* Validation handling
* Scheduled automation

### WebApp.gs

* Executive dashboard UI
* Real-time data access
* Browser-based reporting

---

## Alert Logic

### Intern Last Working Day Alert

Triggered when:

Last Working Day is within ±45 days of the current date.

### Probation Alert

Confirmation Date = Date of Joining + 180 days

Triggered when:

Confirmation Date falls within the next 30 days.

All thresholds are configurable through the `_Config` sheet.

---

## Logging & Monitoring

### Logs Tab

Captures:

* INFO messages
* WARN messages
* ERROR messages
* Execution history

### Changelog Tab

Captures:

* Run ID
* Timestamp
* Trigger source
* Alert counts
* Execution duration
* Email status

---

## Technology Stack

* Google Sheets
* Google Apps Script (V8 Runtime)
* HtmlService
* JavaScript
* HTML5
* CSS3

---

## Repository Structure

HR-Automation-Dashboard/

├── DataLayer.gs

├── Dashboard.gs

├── Alerts.gs

├── OrgChart.gs

├── DrillDown.gs

├── Triggers.gs

├── Config.gs

├── Logs.gs

├── WebApp.gs

├── WebApp1.html

├── appsscript.json

├── README.md

└── HR_Dashboard_SOP.pdf

---

## Documentation

Detailed implementation and operational documentation is available in:

**HR_Dashboard_SOP.pdf**

The SOP covers:

* System architecture
* Dashboard workflow
* Alert logic
* Real-time reflection mechanism
* Trigger configuration
* Troubleshooting guide
* Maintenance procedures

---

## Author

**Lokineni Hindhuja Rao**

Computer Science Engineering

Keshav Memorial Institute of Technology (KMIT)

LinkedIn:
https://www.linkedin.com/in/lokineni-hindhuja-rao-83a1a1354

---

## Status

✅ Production Ready

✅ Real-Time Dashboard

✅ Automated Alerts

✅ Auto Refresh Web Application

✅ Dynamic Org Chart

✅ Employee Drill-Down Analytics

✅ HR Workflow Automation
