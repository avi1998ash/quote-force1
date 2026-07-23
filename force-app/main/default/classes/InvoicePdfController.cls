public with sharing class InvoicePdfController {
    public QuoteForce__Invoice__c invoiceRecord { get; private set; }
    public QuoteForce__Admin_Configuration__c companyinfo { get; private set; }
    public String logoUrl { get; private set; }

    public List<InvoiceLineItemWrapper> lineItems { get; private set; }

    public Decimal subtotal { get; private set; }
    public Decimal grandTotal { get; private set; }

    public InvoicePdfController(ApexPages.StandardController stdController) {
        Id invoiceId = stdController.getId();

        subtotal = 0;
        grandTotal = 0;
        lineItems = new List<InvoiceLineItemWrapper>();

        if (invoiceId == null) {
            return;
        }

        invoiceRecord = [
            SELECT Id, Name, QuoteForce__Date__c, QuoteForce__Layout_Name__c, QuoteForce__Status__c,
                   QuoteForce__Tax__c, QuoteForce__Bill_To__Street__s, QuoteForce__Bill_To__City__s, QuoteForce__Bill_To__StateCode__s,
                   QuoteForce__Bill_To__PostalCode__s, QuoteForce__Bill_To__CountryCode__s,
                   QuoteForce__Ship_To__Street__s, QuoteForce__Ship_To__City__s, QuoteForce__Ship_To__StateCode__s,
                   QuoteForce__Ship_To__PostalCode__s, QuoteForce__Ship_To__CountryCode__s,
                   QuoteForce__Warranty__c, QuoteForce__Terms_Conditions__c,
                   QuoteForce__Primary_Image__c, QuoteForce__Secondary_Image__c,
                   QuoteForce__Expiration_Date__c
            FROM QuoteForce__Invoice__c
            WHERE Id = :invoiceId WITH USER_MODE
            LIMIT 1
        ];

        companyinfo = AdminSettingController.getAdminConfig();
        logoUrl = buildLogoUrl(companyinfo);

        for (QuoteForce__Invoice_line_items__c li : [
            SELECT Id, QuoteForce__Quantity__c, QuoteForce__Price__c, QuoteForce__Product_Custom__r.Name
            FROM QuoteForce__Invoice_line_items__c
            WHERE QuoteForce__Invoice__c = :invoiceId WITH USER_MODE
            ORDER BY CreatedDate ASC
        ]) {
            Decimal qty = li.QuoteForce__Quantity__c != null ? li.QuoteForce__Quantity__c : 0;
            Decimal unitPrice = li.QuoteForce__Price__c != null ? li.QuoteForce__Price__c : 0;
            Decimal lineTotal = qty * unitPrice;

            subtotal += lineTotal;

            InvoiceLineItemWrapper w = new InvoiceLineItemWrapper();
            w.productName = (li.QuoteForce__Product_Custom__r != null) ? li.QuoteForce__Product_Custom__r.Name : null;
            w.quantity = qty;
            w.unitPrice = unitPrice;
            w.lineTotal = lineTotal;
            lineItems.add(w);
        }

        Decimal tax = invoiceRecord.QuoteForce__Tax__c != null ? invoiceRecord.QuoteForce__Tax__c : 0;
        grandTotal = subtotal + tax;
    }

    private static String buildLogoUrl(QuoteForce__Admin_Configuration__c cfg) {
        if (cfg == null || String.isBlank(cfg.QuoteForce__Company_Logo_URL__c)) {
            return null;
        }

        String v = cfg.QuoteForce__Company_Logo_URL__c.trim();

        // If it's already a full URL, just use it.
        if (v.startsWith('http://') || v.startsWith('https://')) {
            return v;
        }

        // If it's a relative /sfc/... path saved by AdminSettingController.saveFileUrl().
        if (v.startsWith('/sfc/')) {
            return URL.getOrgDomainUrl().toExternalForm() + v;
        }

        // Otherwise assume it's a ContentDocumentId.
        return URL.getOrgDomainUrl().toExternalForm() +
            '/sfc/servlet.shepherd/document/download/' + v;
    }

    public class InvoiceLineItemWrapper {
        public String productName { get; set; }
        public Decimal quantity { get; set; }
        public Decimal unitPrice { get; set; }
        public Decimal lineTotal { get; set; }
    }
}