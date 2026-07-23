@isTest
public class InvoicePageSectionController_Test {

    @isTest
    static void testControllerFullCoverage() {

        // Product (standard)
        Product2 prod = new Product2(
            Name = 'Test Product',
            IsActive = true
        );
        insert prod;

        // Invoice
        QuoteForce__Invoice__c inv = new QuoteForce__Invoice__c(
            Name = 'Test Invoice',
            QuoteForce__Tax__c = 10,
            QuoteForce__Pages_JSON__c =
            '[{"Name":"Title","toggle":true},' +
            '{"Name":"Quote Details","toggle":true}]'
        );
        insert inv;

        // Section
        QuoteForce__Product_Section__c sec = new QuoteForce__Product_Section__c(
            Name = 'Section 1',
            QuoteForce__Invoice__c = inv.Id
        );
        insert sec;

        // Line Item
        QuoteForce__Invoice_line_items__c li = new QuoteForce__Invoice_line_items__c(
            QuoteForce__Invoice__c = inv.Id,
            QuoteForce__Product__c = prod.Id,
            QuoteForce__Quantity__c = 2,
            QuoteForce__Price__c = 50,
            QuoteForce__Section_Id__c = sec.Id
        );
        insert li;

        // Admin config
        QuoteForce__Admin_Configuration__c config =
            new QuoteForce__Admin_Configuration__c(Name = 'Admin');
        insert config;

        // Page param
        Test.setCurrentPage(new ApexPages.PageReference('/apex/test'));
        ApexPages.currentPage().getParameters().put('id', inv.Id);

        Test.startTest();
        new InvoicePageSectionController();
        Test.stopTest();
    }
}