@IsTest
private class InvoicePdfControllerTest {

    @testSetup
    static void setupData() {
        insert new QuoteForce__Admin_Configuration__c(
            Name = 'PDF Config',
            QuoteForce__Company_Logo_URL__c = 'https://example.com/logo.png',
            QuoteForce__Currency__c = 'USD'
        );

        Product2 productRecord = new Product2(
            Name = 'PDF Product',
            ProductCode = 'PDF-001',
            IsActive = true
        );
        insert productRecord;

        QuoteForce__Invoice__c invoiceRecord = new QuoteForce__Invoice__c(
            Name = 'PDF Invoice',
            QuoteForce__Tax__c = 12
        );
        insert invoiceRecord;

        insert new List<QuoteForce__Invoice_line_items__c>{
            new QuoteForce__Invoice_line_items__c(
                QuoteForce__Invoice__c = invoiceRecord.Id,
                QuoteForce__Product__c = productRecord.Id,
                QuoteForce__Quantity__c = 2,
                QuoteForce__Price__c = 25
            ),
            new QuoteForce__Invoice_line_items__c(
                QuoteForce__Invoice__c = invoiceRecord.Id,
                QuoteForce__Quantity__c = 1,
                QuoteForce__Price__c = 10
            )
        };
    }

    @IsTest
    static void testControllerWithInvoiceId() {
        QuoteForce__Invoice__c invoiceRecord = [SELECT Id FROM QuoteForce__Invoice__c WHERE Name = 'PDF Invoice' LIMIT 1];
        ApexPages.StandardController standardController = new ApexPages.StandardController(invoiceRecord);

        Test.startTest();
        InvoicePdfController controller = new InvoicePdfController(standardController);
        Test.stopTest();

        Decimal subtotalValue = controller.subtotal;
        Decimal grandTotalValue = controller.grandTotal;
        String logo = controller.logoUrl;
        List<InvoicePdfController.InvoiceLineItemWrapper> wrappers = controller.lineItems;
    }

    @IsTest
    static void testControllerWithoutInvoiceId() {
        ApexPages.StandardController standardController = new ApexPages.StandardController(new QuoteForce__Invoice__c());

        Test.startTest();
        InvoicePdfController controller = new InvoicePdfController(standardController);
        Test.stopTest();

        Decimal subtotalValue = controller.subtotal;
        Decimal grandTotalValue = controller.grandTotal;
        List<InvoicePdfController.InvoiceLineItemWrapper> wrappers = controller.lineItems;
    }
}