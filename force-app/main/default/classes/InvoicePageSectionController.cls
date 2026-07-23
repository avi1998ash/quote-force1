public with sharing class InvoicePageSectionController {
    public QuoteForce__Invoice__c invoiceRecord { get; set; }
    public QuoteForce__Admin_Configuration__c companyinfo { get; set; }
    public Boolean isTitle { get; set; }
    public Boolean isLetterFromOwner { get; set; }
    public Boolean isQuoteDetails { get; set; }
    public Boolean isWarranty { get; set; }
    public Boolean isTermsAndConditions { get; set; }
    public Boolean isCustomPage { get; set; }
    public List<InvoiceSectionWrap> sectionsData { get; private set; }
    public Decimal grandTotal { get; private set; }

    public class SectionWrapper {
        public String Id { get; set; }
        public String Name { get; set; }
        public String label { get; set; }
        public Boolean selected { get; set; }
        public Boolean editMode { get; set; }
        public Boolean toggle { get; set; }
    }

    // VF-friendly wrapper to render invoice section tables.
    public class InvoiceSectionWrap {
        public String sectionId { get; set; }
        public String sectionName { get; set; }
        public String notes { get; set; }
        public List<ProductConfigurationController.InvoiceSectionItemWrapper> lineItems { get; set; }
        public Decimal sectionTotal { get; set; }
    }

    public InvoicePageSectionController() {
        isTitle = false;
        isLetterFromOwner = false;
        isQuoteDetails = false;
        isWarranty = false;
        isTermsAndConditions = false;
        isCustomPage = false;
        sectionsData = new List<InvoiceSectionWrap>();
        grandTotal = 0;

        Id recordId = QuoteForceSecurityUtil.requireId(
            ApexPages.currentPage().getParameters().get('id'),
            'Invoice Id'
        );

        invoiceRecord = [
            SELECT Id, Name, QuoteForce__Expiration_Date__c, QuoteForce__Status__c, QuoteForce__Tax__c,
                QuoteForce__Terms_Conditions__c, QuoteForce__Warranty__c, QuoteForce__Pages_JSON__c,
                QuoteForce__Secondary_Image__c, QuoteForce__Primary_Image__c,
                QuoteForce__Bill_To__Street__s, QuoteForce__Bill_To__City__s, QuoteForce__Bill_To__StateCode__s,
                QuoteForce__Bill_To__PostalCode__s, QuoteForce__Bill_To__CountryCode__s,
                QuoteForce__Ship_To__Street__s, QuoteForce__Ship_To__City__s, QuoteForce__Ship_To__StateCode__s,
                QuoteForce__Ship_To__PostalCode__s, QuoteForce__Ship_To__CountryCode__s,
                QuoteForce__First_Name__c, QuoteForce__Last_Name__c, QuoteForce__Layout_Name__c, QuoteForce__Street_Address__c,
                QuoteForce__City__c, QuoteForce__State_Province__c, QuoteForce__Zip_code_Postal_code__c,
                QuoteForce__Date__c, QuoteForce__Letter_from_the_owner__c
            FROM QuoteForce__Invoice__c
            WHERE Id = :recordId WITH USER_MODE
            LIMIT 1
        ];

        List<SectionWrapper> sections = new List<SectionWrapper>();
        if (!String.isBlank(invoiceRecord.QuoteForce__Pages_JSON__c)) {
            try {
                sections = (List<SectionWrapper>) JSON.deserialize(invoiceRecord.QuoteForce__Pages_JSON__c, List<SectionWrapper>.class);
            } catch (Exception ex) {
                System.debug('Failed to parse invoice QuoteForce__Pages_JSON__c: ' + ex.getMessage());
            }
        }

        for (SectionWrapper sec : sections) {
            if (sec.toggle == true) {
                if (sec.Name == 'Title') {
                    isTitle = true;
                } else if (sec.Name == 'Letter from the owner') {
                    isLetterFromOwner = true;
                } else if (sec.Name == 'Quote Details') {
                    isQuoteDetails = true;
                } else if (sec.Name == 'Warranty') {
                    isWarranty = true;
                } else if (sec.Name == 'Terms and Conditions') {
                    isTermsAndConditions = true;
                }
            }
        }

        companyinfo = AdminSettingController.getAdminConfig();

        // Load invoice sections + line items for the Line Items section on the PDF.
        if (recordId != null) {
            try {
                Id invoiceId = recordId;
                List<ProductConfigurationController.InvoiceSectionWrapper> rawSections =
                    ProductConfigurationController.getInvoiceSectionData(invoiceId);

                for (ProductConfigurationController.InvoiceSectionWrapper rs : rawSections) {
                    InvoiceSectionWrap sw = new InvoiceSectionWrap();
                    sw.sectionId = rs.sectionId != null ? String.valueOf(rs.sectionId) : null;
                    sw.sectionName = rs.sectionName;
                    sw.notes = rs.notes;
                    sw.lineItems = rs.lineItems != null
                        ? rs.lineItems
                        : new List<ProductConfigurationController.InvoiceSectionItemWrapper>();

                    Decimal sectionTotal = 0;
                    for (ProductConfigurationController.InvoiceSectionItemWrapper li : sw.lineItems) {
                        Decimal qty = li.quantity != null ? li.quantity : 0;
                        Decimal price = li.price != null ? li.price : 0;
                        sectionTotal += qty * price;
                    }

                    sw.sectionTotal = sectionTotal;
                    sectionsData.add(sw);
                    grandTotal += sectionTotal;
                }
            } catch (Exception e) {
                System.debug('Failed to load invoice sections: ' + e.getMessage());
            }
        }
    }
}