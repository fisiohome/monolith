# Voucher Bulk Upload Documentation

## Overview

The voucher bulk upload feature allows administrators to create multiple vouchers at once by uploading an Excel (.xlsx) file. The system provides a pre-formatted template with dropdowns, validation, and helper features to ensure data quality and ease of use.

## Features

### Excel Template Features

1. **Human-Readable Headers**
   - All column headers are in plain English
   - Required fields marked with asterisks (*)
   - Date formats included in header names

2. **Data Validation Dropdowns**
   - Discount Type: PERCENTAGE or FIXED
   - Is Active: true or false
   - Package Selection: All available packages in dropdown

3. **Package Reference Sheet**
   - Complete list of all available packages
   - Checkbox selection for multiple packages
   - Auto-generated comma-separated list
   - Filter and sort capabilities

4. **Helper Columns**
   - Package Selection Helper column with examples
   - Can be deleted after understanding the format

5. **Instructions Sheet**
   - Step-by-step guide for filling the template
   - Multiple package selection methods
   - Tips and best practices

## Sheet Structure

The generated Excel file contains 3 sheets:

### 1. Vouchers Sheet
Main data entry sheet with the following columns:

| Column Header | Required? | Format | Description |
|---------------|-----------|--------|-------------|
| Voucher Code* | Yes | Text | Unique voucher code (auto-converted to uppercase) |
| Voucher Name | No | Text | Display name for the voucher |
| Description | No | Text | Detailed description |
| Discount Type* | Yes | Dropdown | PERCENTAGE or FIXED |
| Discount Value* | Yes | Number | Discount amount (e.g., 10 for 10% or $10) |
| Quota* | Yes | Integer | Number of times voucher can be used |
| Max Discount Amount | No | Number | Maximum discount for percentage vouchers |
| Min Order Amount | No | Number | Minimum order amount to use voucher |
| Valid From (YYYY-MM-DD) | No | Date | Start date in YYYY-MM-DD format |
| Valid Until (YYYY-MM-DD) | No | Date | End date in YYYY-MM-DD format |
| Is Active (true/false) | No | Dropdown | true or false (default: true) |
| Package(s) | No | Text | Package names separated by commas |
| Package Selection Helper | No | Text | Examples and guidance (can be deleted) |

### 2. Package Reference Sheet
Helper sheet for package selection with:

- Package ID, Package Name, Service Name, Full Name columns
- Checkbox column (Column E) for selecting packages
- Auto-generated list at cell A4 using TEXTJOIN formula
- Instructions for multiple package selection
- Filter on first 3 columns

### 3. Instructions Sheet
Complete user guide including:

- How to use the template
- Required and optional fields
- Package selection methods
- Tips and best practices
- Date format examples

## Package Selection Methods

### Method 1: Single Package via Dropdown
1. Click the dropdown in the Package(s) column
2. Select desired package from the list
3. Package appears as "Service Name - Package Name"

### Method 2: Multiple Packages via Manual Entry
1. Type directly in the Package(s) column
2. Format: "Package 1, Package 2, Package 3"
3. Example: "Massage - Swedish, Facial - Basic, Spa - Premium"

### Method 3: Checkbox Selection (Recommended for Multiple)
1. Go to Package Reference sheet
2. Type "X" in the Select column (Column E) for desired packages
3. Copy the auto-generated list from cell A4
4. Paste in the Package(s) column in Vouchers sheet

## Upload Process

### Step 1: Download Template
1. Navigate to Vouchers page in admin portal
2. Click "Bulk Upload" button
3. Click "Download Template" button
4. Save the Excel file

### Step 2: Fill Template
1. Open the downloaded Excel file
2. Fill in required fields (marked with *)
3. Use dropdowns where available
4. Select packages using preferred method
5. Save the file as .xlsx format

### Step 3: Upload and Preview
1. Return to bulk upload dialog
2. Click "Select Excel File" or drag and drop
3. Choose your filled .xlsx file
4. Click "Upload & Preview" button
5. Wait for processing and review the preview table

### Step 4: Review and Save
1. **Review Preview Table**: Shows each row with status (Valid/Error)
2. **Check Summary**: See count of valid vouchers and errors
3. **Fix Errors if Needed**: Click "Re-upload File" to fix issues
4. **Save Vouchers**: Click "Save X Vouchers" to create them in database
5. **View Results**: Success message shows number of vouchers created

### Two-Step Upload Process
The system uses a two-step process for safety:
- **Step 1 (Preview)**: Validates your file without saving to database
- **Step 2 (Save)**: Actually creates the vouchers after you review the preview

## Data Validation

### Server-Side Validation
- Required fields must be present
- Discount values must be positive numbers
- Quota must be non-negative integer
- Dates must be valid YYYY-MM-DD format
- Voucher codes must be unique
- Package names must exist in database

### Client-Side Validation
- Only .xlsx files accepted
- File size limits (if configured)
- MIME type verification

## Error Handling

### Common Errors and Solutions

| Error Message | Cause | Solution |
|---------------|-------|----------|
| "Missing required headers" | Template corrupted or modified | Download fresh template |
| "Invalid date format" | Date not in YYYY-MM-DD | Use correct date format |
| "Duplicate voucher codes" | Code already exists in database or appears multiple times in file | Use unique codes, check for duplicates in your file |
| "Package not found" | Invalid package name | Use Package Reference sheet for exact names |
| "Only Excel (.xlsx) files are accepted" | Wrong file format | Download and use Excel template |
| "Discount type must be PERCENTAGE or FIXED" | Invalid discount type value | Use dropdown to select valid values |
| "Discount value must be greater than 0" | Zero or negative discount value | Enter positive number |
| "Quota must be greater than or equal to 0" | Negative quota value | Enter zero or positive number |
| "Valid from date must be before valid until date" | Date range is invalid | Ensure start date is before end date |

### Preview Table Error Indicators
- **Green rows**: Vouchers that will be created successfully
- **Red rows**: Vouchers with errors that won't be created
- **Reason column**: Shows specific error for each failed row
- **Row numbers**: Help you locate errors in your Excel file

## Technical Implementation

### Backend Components

1. **VoucherTemplateService** (`app/services/admin_portal/voucher_template_service.rb`)
   - Generates Excel template with caxlsx gem
   - Creates 3 sheets: Vouchers, Package Reference, Instructions
   - Adds data validation dropdowns for discount type and active status
   - Includes sample data rows for guidance
   - Helper column with examples for package selection

2. **VouchersService** (`app/services/admin_portal/vouchers_service.rb`)
   - Processes uploaded Excel files using roo gem
   - Maps human-readable headers to database fields
   - Two-step processing: preview (save_to_db=false) and actual save
   - Validates all data including package names
   - Returns detailed row-by-row results for preview
   - Handles duplicate detection within file and database

3. **VouchersController** (`app/controllers/admin_portal/vouchers_controller.rb`)
   - Handles file upload with type validation
   - Supports both preview and save modes via save_to_db parameter
   - Returns JSON responses with detailed results
   - Sets flash messages on successful save

### Frontend Components

1. **BulkUploadDialog** (`app/frontend/components/admin-portal/vouchers/bulk-upload-dialog.tsx`)
   - Drawer-style modal with two-step workflow
   - File drag-and-drop support with 5MB limit
   - Progress tracking during upload
   - Preview table with color-coded status indicators
   - Summary statistics (valid vs error counts)
   - Re-upload functionality to fix errors

2. **Upload Flow Features**
   - Step 1: Upload & Preview with detailed validation results
   - Step 2: Save to database after review
   - Automatic page refresh after successful save
   - Error messages with specific row numbers
   - File removal and re-upload capability

## Best Practices

1. **Always use the latest template** - Features may be added over time
2. **Save as .xlsx** - Preserves dropdowns and formatting
3. **Use Package Reference sheet** - Ensures correct package names
4. **Check duplicate codes** - Avoid upload failures (both in file and database)
5. **Test with small batches** - Validate format before large uploads
6. **Keep package names exact** - Case-sensitive matching
7. **Review preview carefully** - Check all rows have correct status
8. **Fix errors before saving** - Use re-upload to correct issues
9. **Watch file size** - Maximum 5MB limit for uploads

## Troubleshooting

### Template Issues
- Dropdowns not working: Save as .xlsx (not .xls)
- Formulas not calculating: Enable calculations in Excel
- Hidden sheets visible: Normal behavior, can be ignored

### Upload Issues
- File too large: Split into smaller batches (under 5MB)
- Processing timeout: Reduce batch size
- Partial success: Check error messages for specific rows

### Data Issues
- Special characters: Avoid in voucher codes
- Empty rows: Delete before uploading
- Extra columns: Delete from template
- Date formats: Must be YYYY-MM-DD

### Preview Issues
- No preview shown: Check file format is .xlsx
- All rows show errors: Verify required fields are filled
- Package errors: Use exact names from Package Reference sheet

## File Specifications

- **Format**: Excel (.xlsx) only
- **Max size**: 5MB (frontend limit)
- **Encoding**: UTF-8
- **Required sheets**: Vouchers, Package Reference, Instructions
- **Required headers**: All headers must match exactly
- **Date format**: YYYY-MM-DD (e.g., 2024-01-01)
- **Voucher codes**: Auto-converted to uppercase
- **Package names**: Case-sensitive matching

## Security Considerations

- File type validation on both client and server
- Package names validated against database
- SQL injection protection through ActiveRecord
- File content scanned for macros (Excel security)
- CSRF token required for all uploads
- Admin authentication required

## Key Features Summary

### Template Features
- Human-readable column headers with required field markers
- Data validation dropdowns for Discount Type and Is Active
- Package Reference sheet with checkbox selection
- Auto-generated package list using TEXTJOIN formula
- Sample data rows for guidance
- Comprehensive Instructions sheet

### Upload Features
- Two-step process: Preview then Save
- Drag-and-drop file upload
- Progress tracking during upload
- Detailed preview table with status indicators
- Row-by-row error reporting
- Duplicate detection (file and database)
- Re-upload capability to fix errors
- Automatic page refresh on success

### Validation Features
- All required fields checked
- Discount value must be positive
- Quota must be non-negative
- Date format validation
- Date range validation
- Package name validation
- Unique voucher code enforcement
