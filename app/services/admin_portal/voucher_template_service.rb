module AdminPortal
  class VoucherTemplateService
    require "caxlsx"

    def self.generate_template
      package = Axlsx::Package.new
      workbook = package.workbook

      # Fetch packages once to reuse across sheets
      packages = Package.joins(:service)
        .select("packages.id, packages.name, services.name as service_name")
        .order("services.name, packages.name")
        .to_a

      # Create voucher data sheet
      create_vouchers_sheet(workbook, packages)

      # Create package reference sheet with improved UX
      create_package_reference_sheet(workbook, packages)

      # Create instructions sheet
      create_instructions_sheet(workbook)

      package.to_stream.read
    end

    class << self
      private

      def create_vouchers_sheet(workbook, packages)
        workbook.add_worksheet(name: "Vouchers") do |sheet|
          # Add headers with styling
          header_style = sheet.styles.add_style(
            b: true,
            bg_color: "E6E6FA",
            border: {style: :thin, color: "000000"}
          )

          # Define headers
          headers = [
            "Voucher Code*",
            "Voucher Name",
            "Description",
            "Discount Type*",
            "Discount Value*",
            "Quota*",
            "Max Discount Amount",
            "Min Order Amount",
            "Valid From (YYYY-MM-DD)",
            "Valid Until (YYYY-MM-DD)",
            "Is Active (true/false)",
            "Package(s)",
            "Package Selection Helper"
          ]

          # Add header row
          sheet.add_row(headers, style: header_style)

          # Style the helper column as light gray to indicate it's for help
          helper_col_style = sheet.styles.add_style(
            bg_color: "F5F5F5",
            font_name: "Calibri",
            sz: 10,
            i: true
          )
          sheet.col_style(13, helper_col_style, row_offset: 1)

          # Add sample data rows
          add_sample_rows(sheet, packages)

          # Set column widths
          sheet.column_widths(15, 20, 30, 15, 15, 10, 18, 16, 12, 12, 10, 20, 30)

          # Add data validation for discount_type dropdown
          add_discount_type_validation(sheet)

          # Add data validation for is_active dropdown
          add_is_active_validation(sheet)

          # Add data validation for package_ids dropdown
          add_package_ids_validation(workbook, sheet, packages)
        end
      end

      def add_sample_rows(sheet, packages)
        # Get some sample packages for realistic examples
        sample_packages = packages.first(5)

        # Create sample package names
        package_examples = sample_packages.map { |p| "#{p.service_name} - #{p.name}" }

        # Sample row 1 - Percentage discount with single package
        sheet.add_row([
          "SAVE10",
          "Summer Sale",
          "10% off on all services",
          "PERCENTAGE",
          10,
          100,
          "",
          50,
          "2024-01-01",
          "2024-12-31",
          "true",
          package_examples[0] || "Service - Package",
          "Single package selected"
        ])

        # Sample row 2 - Fixed discount with multiple packages
        sample_packages_text = if package_examples.length > 2
          package_examples[1..2].join(", ")
        else
          "Service - Package, Service 2 - Package 2"
        end

        sheet.add_row([
          "FIXED20",
          "Fixed Discount",
          "$20 off on minimum order of $100",
          "FIXED",
          20,
          50,
          "",
          100,
          "2024-06-01",
          "2024-08-31",
          "true",
          sample_packages_text,
          "Multiple packages: enter names separated by commas"
        ])

        # Sample row 3 - Percentage with max discount, no packages
        sheet.add_row([
          "WELCOME30",
          "Welcome Offer",
          "30% off for new customers",
          "PERCENTAGE",
          30,
          25,
          100,
          "",
          "2024-01-01",
          "2024-06-30",
          "true",
          "",
          "No packages - leave empty"
        ])
      end

      def add_discount_type_validation(sheet)
        # Add dropdown validation for discount_type column (column D)
        sheet.add_data_validation(
          "D2:D1048576",  # Apply to all rows in column D
          type: :list,
          formula1: '"PERCENTAGE,FIXED"',
          hideDropDown: false,
          errorTitle: "Invalid Discount Type",
          error: "Please select PERCENTAGE or FIXED from the dropdown",
          errorStyle: :stop,
          showErrorMessage: true
        )
      end

      def add_is_active_validation(sheet)
        # Add dropdown validation for is_active column (column K)
        sheet.add_data_validation(
          "K2:K1048576",  # Apply to all rows in column K
          type: :list,
          formula1: '"true,false"',
          hideDropDown: false,
          errorTitle: "Invalid Value",
          error: "Please select true or false from the dropdown",
          errorStyle: :stop,
          showErrorMessage: true
        )
      end

      def add_package_ids_validation(workbook, sheet, packages)
        # Add dropdown validation referencing the Package Reference sheet directly
        # This avoids creating an extra hidden sheet and uses the Full Name column
        sheet.add_data_validation(
          "L2:L1048576",  # Apply to all rows in column L
          type: :list,
          formula1: "='Package Reference'!$D$8:$D$#{packages.length + 7}",
          hideDropDown: false,
          errorTitle: "Package Selection",
          error: "For multiple packages: Type names separated by commas (e.g., 'Package 1, Package 2')",
          errorStyle: :information,
          showErrorMessage: true,
          promptTitle: "Package Selection",
          prompt: "Single: Select from dropdown | Multiple: Type 'Service - Package, Service2 - Package2'"
        )

        # Add helper text for the helper column (column M)
        sheet.add_data_validation(
          "M2:M1048576",
          type: :none,
          promptTitle: "Package Helper",
          prompt: "Examples: Single: 'Service - Package Name' | Multiple: 'Service - Package Name, Service 2 - Package 2'",
          showPrompt: true,
          showErrorMessage: false
        )
      end

      def create_package_reference_sheet(workbook, packages)
        workbook.add_worksheet(name: "Package Reference") do |sheet|
          # Define styles
          title_style = sheet.styles.add_style(
            b: true,
            sz: 14,
            bg_color: "4472C4",
            fg_color: "FFFFFF",
            alignment: {horizontal: :center},
            border: {style: :thin, color: "000000"}
          )

          header_style = sheet.styles.add_style(
            b: true,
            bg_color: "D9E2F3",
            border: {style: :thin, color: "000000"},
            alignment: {horizontal: :center}
          )

          id_style = sheet.styles.add_style(
            alignment: {horizontal: :center},
            border: {style: :thin, color: "D9D9D9"}
          )

          name_style = sheet.styles.add_style(
            border: {style: :thin, color: "D9D9D9"},
            alignment: {horizontal: :left}
          )

          service_style = sheet.styles.add_style(
            border: {style: :thin, color: "D9D9D9"},
            bg_color: "F2F2F2",
            alignment: {horizontal: :left}
          )

          checkbox_style = sheet.styles.add_style(
            alignment: {horizontal: :center},
            border: {style: :thin, color: "D9D9D9"},
            bg_color: "E2EFDA"
          )

          formula_style = sheet.styles.add_style(
            b: true,
            bg_color: "FFF2CC",
            border: {style: :thin, color: "000000"},
            alignment: {horizontal: :left, vertical: :top, wrap_text: true}
          )

          # Title
          sheet.add_row(["Package Reference"], style: title_style)
          sheet.merge_cells("A1:E1")
          sheet.add_row([])

          # Generated list section
          sheet.add_row(["Selected Packages (Copy this):"], style: header_style)
          sheet.merge_cells("A3:E3")

          # Add formula cell for generating comma-separated list
          # Using TEXTJOIN function available in Excel 2016+
          formula = "=TEXTJOIN(\", \", TRUE, IF(E8:E#{packages.length + 7}=\"X\", D8:D#{packages.length + 7}, \"\"))"
          sheet.add_row([formula, "", "", "", "Type X to select packages"], style: [formula_style, nil, nil, nil, sheet.styles.add_style(i: true, sz: 10)])
          sheet.merge_cells("A4:D4")

          sheet.add_row([])
          sheet.add_row([])

          # Instructions
          instruction_style = sheet.styles.add_style(
            i: true,
            bg_color: "FFF2CC",
            border: {style: :thin, color: "000000"}
          )
          sheet.add_row(["How to use packages in the Vouchers sheet:"], style: instruction_style)
          sheet.merge_cells("A7:E7")
          sheet.add_row(["• Single package: Select from dropdown or type 'Service - Package Name'"], style: instruction_style)
          sheet.merge_cells("A8:E8")
          sheet.add_row(["• Multiple packages: Use the checkboxes below, then copy the generated list from A4"], style: instruction_style)
          sheet.merge_cells("A9:E9")
          sheet.add_row(["• Or type manually: 'Package 1, Package 2, Package 3' separated by commas"], style: instruction_style)
          sheet.merge_cells("A10:E10")
          sheet.add_row([])

          # Headers
          sheet.add_row(["Package ID", "Package Name", "Service Name", "Full Name", "Select"], style: header_style)

          # Add package data with alternating row colors
          packages.each_with_index do |package, index|
            full_name = "#{package.service_name} - #{package.name}"
            row_style = index.even? ? [id_style, name_style, service_style, name_style, checkbox_style] : [id_style, name_style, name_style, name_style, checkbox_style]

            sheet.add_row([
              package.id,
              package.name,
              package.service_name,
              full_name,
              ""  # Empty for X
            ], style: row_style)
          end

          # Set column widths
          sheet.column_widths 12, 30, 25, 40, 10

          # Add filter for first 3 columns
          sheet.auto_filter = "A13:C#{packages.length + 12}"

          # Add data validation for checkbox column (only X or empty)
          sheet.add_data_validation(
            "E8:E#{packages.length + 12}",
            type: :list,
            formula1: '"X,"',
            hideDropDown: true,
            errorTitle: "Invalid Selection",
            error: "Type 'X' to select or leave empty",
            errorStyle: :stop,
            showErrorMessage: true
          )

          # Add clear instruction
          sheet.add_row([])
          sheet.add_row(["Tip: To clear all selections, select column E -> Delete -> Press Enter"],
            style: sheet.styles.add_style(i: true, sz: 10))
          sheet.merge_cells("E#{packages.length + 14}:G#{packages.length + 14}")
        end
      end

      def create_instructions_sheet(workbook)
        workbook.add_worksheet(name: "Instructions") do |sheet|
          # Define styles
          title_style = sheet.styles.add_style(
            b: true,
            sz: 16,
            bg_color: "4472C4",
            fg_color: "FFFFFF",
            alignment: {horizontal: :center},
            border: {style: :thin, color: "000000"}
          )

          section_style = sheet.styles.add_style(
            b: true,
            sz: 12,
            bg_color: "D9E2F3",
            border: {style: :thin, color: "000000"}
          )

          # Title
          sheet.add_row(["Voucher Bulk Upload Instructions"], style: title_style)
          sheet.merge_cells("A1:A1")
          sheet.add_row([])

          # Instructions content
          instructions = [
            ["How to use this template:"],
            [],
            ["1. Fill in the 'Vouchers' sheet with voucher data"],
            ["2. Use dropdowns for Discount Type (PERCENTAGE or FIXED)"],
            ["3. Use dropdowns for Is Active (true or false)"],
            ["4. For Package(s), see 'Package Selection Helper' column for guidance"],
            ["5. Date format: YYYY-MM-DD (e.g., 2024-01-01)"],
            ["6. Leave optional fields empty if not needed"],
            [],
            ["Required Fields (marked with *):"],
            ["• Voucher Code: Unique voucher code (will be converted to uppercase)"],
            ["• Discount Type: PERCENTAGE or FIXED"],
            ["• Discount Value: Numeric value > 0"],
            ["• Quota: Integer >= 0"],
            [],
            ["Optional Fields:"],
            ["• Voucher Name: Display name for the voucher"],
            ["• Description: Detailed description"],
            ["• Max Discount Amount: Maximum discount for percentage vouchers"],
            ["• Min Order Amount: Minimum order amount to use voucher"],
            ["• Valid From: Start date (YYYY-MM-DD)"],
            ["• Valid Until: End date (YYYY-MM-DD)"],
            ["• Is Active: true or false (default: true)"],
            ["• Package(s): Select packages by name or enter comma-separated names"],
            [],
            ["Package Selection:"],
            ["• Single Package: Select from dropdown or type 'Service - Package Name'"],
            ["• Multiple Packages: Use checkboxes in Package Reference sheet OR type manually"],
            ["• Checkbox Method: Go to Package Reference sheet, mark X, copy generated list"],
            ["• Package Format: Always use 'Service Name - Package Name' format"],
            ["• Reference: Check the 'Package Reference' sheet for all available packages"],
            [],
            ["Tips:"],
            ["• The 'Package Selection Helper' column provides examples"],
            ["• You can delete the helper column after understanding the format"],
            ["• Save the file as .xlsx format before uploading"],
            ["• Each row creates one voucher"],
            ["• Duplicate codes will cause errors during upload"],
            ["• Package dropdown uses data from Package Reference sheet"]
          ]

          instructions.each do |row|
            if row.first&.start_with?("*", "•", "1.", "2.", "3.", "4.", "5.", "6.") ||
                row.first&.include?(":")
              sheet.add_row(row, style: sheet.styles.add_style(alignment: {horizontal: :left, indent: 1}))
            elsif row.first&.include?("Required") || row.first&.include?("Optional") ||
                row.first&.include?("Package Selection") || row.first&.include?("Tips")
              sheet.add_row(row, style: section_style)
            else
              sheet.add_row(row)
            end
          end

          # Set column width
          sheet.column_widths 80
        end
      end
    end
  end
end
