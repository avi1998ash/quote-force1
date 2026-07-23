@isTest
public class InvoiceController_Test {
    
    @isTest
    static void testInvoiceController() {
        
        // Product
        QuoteForce__Product__c prod = new QuoteForce__Product__c(
            Name = 'Test Product',
            QuoteForce__Description__c = 'Test Desc'
        );
        insert prod;
        
        
        
        // Invoice
        QuoteForce__Invoice__c inv = new QuoteForce__Invoice__c(
            Name = 'Test Invoice',
            QuoteForce__Date__c = Date.today(),
            QuoteForce__Tax__c = 10,
            QuoteForce__Bill_to__Street__s = 'Burlington',
            QuoteForce__Bill_to__City__s  = 'Lexington ',
            QuoteForce__Layout_Name__c = 'Layout_Name__c',
            QuoteForce__Quotes_Name__c = 'Name__c',
            QuoteForce__Expiration_Date__c = date.Today(),
            QuoteForce__Letter_from_the_owner__c = 'sdsdsds',
            QuoteForce__Terms_Conditions__c = 'fsdfsssdfsf',
            QuoteForce__Bill_to__PostalCode__s = '88888'  
        );
        insert inv;
        
        // Invoice Line Item
        QuoteForce__Invoice_line_items__c item = new QuoteForce__Invoice_line_items__c(
            
            QuoteForce__Invoice__c = inv.Id,
            QuoteForce__Quantity__c = 2,
            QuoteForce__Price__c = 50,
            QuoteForce__Product_Custom__c = prod.Id
        );
        insert item;
        
        // Admin Config (IMPORTANT)
        QuoteForce__Admin_Configuration__c config = new QuoteForce__Admin_Configuration__c(
            Name = 'Admin',
            QuoteForce__Email__c = 'test@test.com',
            QuoteForce__Phone__c = '9999999999',
            QuoteForce__Street__c = 'Street',
            QuoteForce__City__c = 'City',
            QuoteForce__Postal_Code__c = 380001
        );
        insert config;
        
        Test.startTest();
        
        ApexPages.StandardController sc =
            new ApexPages.StandardController(inv);
        
        InvoiceController controller = new InvoiceController(sc);
        controller.getCompanyName();
        controller.getCompanyAddress();
        controller.getInvoiceDateLabel();
        controller.getBilledToDetails();
        controller.getShippingDetails();
        controller.getServiceTitle();
        controller.getReferenceNumber();
        controller.getNotesText();
        controller.getTermsText();
        controller.getEmailText();
        controller.getPhoneText();
        controller.getTermsText();
        controller.getWebsiteText();
        controller.getInvoiceDateLabel();
        controller.getDueDateLabel(); 
        // Set page parameters
        PageReference pageRef = new PageReference('/apex/TestPage');
        pageRef.getParameters().put('id', inv.Id);
        pageRef.getParameters().put('tax', '15');
        Test.setCurrentPage(pageRef);


        // Cover getSpacerHeight()
        Decimal spacer = controller.getSpacerHeight();
        System.assert(spacer >= 0);

        // Cover getEffectiveTax()
        Decimal tax = controller.getEffectiveTax();
        System.assertEquals(15, tax);
        Test.stopTest();

    }
}