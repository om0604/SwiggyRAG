from fpdf import FPDF

pdf = FPDF()

# Page 1
pdf.add_page()
pdf.set_font("Arial", size=12)
pdf.multi_cell(0, 10, "Swiggy Annual Report FY23\n\nFinancial Performance:\nRevenue from operations increased steadily to 4653.30 crores in FY23.\nEBITDA and PAT remained negative over these years. The EBITDA margin was deeply impacted by heavy marketing spends and aggressive expansion.")

# Page 2
pdf.add_page()
pdf.multi_cell(0, 10, "Operations & Business Segments:\nInstamart's performance lagged behind competitors in certain regions but continues to show strong QoQ growth as dark store economics improve.\n\nRisk Factors:\nKey risk factors mentioned include a highly competitive environment in quick commerce, regulatory changes in the gig economy, and delivery partner attrition.")

pdf.output("e:/OM Professional/Projects/SwiggyRAG/backend/data/swiggy_annual_report.pdf")
print("PDF created.")
