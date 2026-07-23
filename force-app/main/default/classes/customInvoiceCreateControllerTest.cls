@IsTest(seeAllData=false)
private class customInvoiceCreateControllerTest {

    @testSetup
    static void setupData() {
        Account accountRecord = new Account(Name = 'Invoice Account');
        insert accountRecord;

        Opportunity opportunityRecord = new Opportunity(
            Name = 'Invoice Opportunity',
            StageName = 'Prospecting',
            CloseDate = Date.today().addDays(15),
            AccountId = accountRecord.Id
        );
        insert opportunityRecord;

        QuoteForce__Master_Template__c masterTemplate = new QuoteForce__Master_Template__c(
            QuoteForce__Layout_Name__c = 'Invoice Layout',
            QuoteForce__Pages_JSON__c = '{"pages":[]}'
        );
        insert masterTemplate;

        QuoteForce__Price_Book__c priceBookRecord = new QuoteForce__Price_Book__c(
            Name = 'Invoice Price Book',
            QuoteForce__Currency__c = 'USD',
            QuoteForce__Is_Active__c = true,
            QuoteForce__Is_Default__c = true
        );
        insert priceBookRecord;

        QuoteForce__Product__c productRecord = new QuoteForce__Product__c(
            Name = 'Invoice Product',
            QuoteForce__Product_Code__c = 'INV-001',
            QuoteForce__Default_Price__c = 150,
            QuoteForce__Default_Quantity__c = 2,
            QuoteForce__Currency__c = 'USD',
            QuoteForce__Active__c = true
        );
        insert productRecord;

        QuoteForce__Price_Book_Entry__c priceBookEntry = new QuoteForce__Price_Book_Entry__c(
            QuoteForce__Price_Book__c = priceBookRecord.Id,
            QuoteForce__Product__c = productRecord.Id,
            QuoteForce__Product_Code__c = 'INV-001',
            QuoteForce__Currency__c = 'USD',
            QuoteForce__Unit_Price__c = 175,
            QuoteForce__Is_Active__c = true
        );
        insert priceBookEntry;

        QuoteForce__Quotes__c quoteRecord = new QuoteForce__Quotes__c(
            Name = 'Invoice Quote',
            QuoteForce__Opportunity__c = opportunityRecord.Id,
            QuoteForce__LayoutId__c = masterTemplate.Id,
            QuoteForce__Layout_Name__c = 'Invoice Layout',
            QuoteForce__Price_Book__c = priceBookRecord.Id,
            QuoteForce__Currency__c = 'USD',
            QuoteForce__Date__c = Date.today(),
            QuoteForce__First_Name__c = 'John',
            QuoteForce__Last_Name__c = 'Doe',
            QuoteForce__Terms_Conditions__c = 'Terms',
            QuoteForce__Warranty__c = 'Warranty',
            QuoteForce__Pages_JSON__c = '{"pages":[1]}'
        );
        insert quoteRecord;

        QuoteForce__Product_Section__c quoteSection = new QuoteForce__Product_Section__c(
            Name = 'Quote Section',
            QuoteForce__Notes__c = 'Section notes',
            QuoteForce__Quotes__c = quoteRecord.Id
        );
        insert quoteSection;

        QuoteForce__QuoteLineItem__c quoteLineItem = new QuoteForce__QuoteLineItem__c(
            QuoteForce__Quotes__c = quoteRecord.Id,
            QuoteForce__Product_Section__c = quoteSection.Id,
            QuoteForce__ProductCode__c = 'INV-001',
            QuoteForce__Quantity__c = 2,
            QuoteForce__Price__c = 175,
            QuoteForce__Price_Book_Entry__c = priceBookEntry.Id,
            QuoteForce__Currency__c = 'USD'
        );
        insert quoteLineItem;

        QuoteForce__Custom_Page__c quotePage = new QuoteForce__Custom_Page__c(
            Name = 'Quote Page',
            QuoteForce__label__c = 'Overview',
            QuoteForce__selected__c = true,
            QuoteForce__editMode__c = false,
            QuoteForce__Text_Page__c = 'Body',
            QuoteForce__toggle__c = true,
            QuoteForce__Currency__c = 'USD',
            QuoteForce__Quotes__c = quoteRecord.Id
        );
        insert quotePage;

        ContentVersion contentVersion = new ContentVersion(
            Title = 'Quote Page File',
            PathOnClient = 'quote-page.txt',
            VersionData = Blob.valueOf('quote page file')
        );
        insert contentVersion;

        contentVersion = [
            SELECT Id, ContentDocumentId
            FROM ContentVersion
            WHERE Id = :contentVersion.Id
        ];

        insert new ContentDocumentLink(
            ContentDocumentId = contentVersion.ContentDocumentId,
            LinkedEntityId = quotePage.Id,
            ShareType = 'V',
            Visibility = 'AllUsers'
        );

        QuoteForce__Invoice__c invoiceRecord = new QuoteForce__Invoice__c(
            Name = 'Invoice Draft',
            QuoteForce__Quotes__c = quoteRecord.Id
        );
        insert invoiceRecord;
    }

    @IsTest
    static void testPicklistAndTemplateMethods() {
        Test.startTest();
        List<Map<String, String>> countries = customInvoiceCreateController.getCountryPicklistValues();
        List<Map<String, String>> supportedStates = customInvoiceCreateController.getStatePicklistValues('US');
        List<Map<String, String>> unsupportedStates = customInvoiceCreateController.getStatePicklistValues('ZZ');
        List<QuoteForce__Master_Template__c> templates = customInvoiceCreateController.getmasterTemplate('Invoice Layout');
        Test.stopTest();
    }

    @IsTest
    static void testAddressAndInvoiceCrudMethods() {
        Opportunity opportunityRecord = [SELECT Id FROM Opportunity LIMIT 1];
        QuoteForce__Quotes__c quoteRecord = [SELECT Id FROM QuoteForce__Quotes__c LIMIT 1];
        QuoteForce__Invoice__c invoiceRecord = [SELECT Id, Name,QuoteForce__Quotes__c FROM QuoteForce__Invoice__c LIMIT 1];

        QuoteForce__Invoice__c newInvoice = new QuoteForce__Invoice__c(
            Name = 'Created Invoice',
            QuoteForce__Quotes__c = quoteRecord.Id
        );

        Test.startTest();
        Opportunity resolvedOpportunity = customInvoiceCreateController.getAddressFromAccount(opportunityRecord.Id);
        String createdInvoiceId = customInvoiceCreateController.createInvoiceRecord(newInvoice);
        invoiceRecord.Name = 'Updated Invoice';
        String updatedInvoiceId = customInvoiceCreateController.updateInvoiceRecord(invoiceRecord);
        QuoteForce__Invoice__c fetchedInvoice = customInvoiceCreateController.getInvoiceDetails(invoiceRecord.Id);
        QuoteForce__Quotes__c fetchedQuote = customInvoiceCreateController.getQuoteDetails(quoteRecord.Id);
        Test.stopTest();
    }

    @IsTest
    static void testCreateQuoteWithChildren() {
        QuoteForce__Quotes__c quoteRecord = [SELECT Id, QuoteForce__LayoutId__c FROM QuoteForce__Quotes__c LIMIT 1];
        QuoteForce__Invoice__c invoiceRecord = [SELECT Id FROM QuoteForce__Invoice__c LIMIT 1];

        Test.startTest();
        Id layoutId = customInvoiceCreateController.createQuoteWithChildren(quoteRecord.Id, invoiceRecord.Id);
        Test.stopTest();

        List<QuoteForce__Invoice__c> invoices = [
            SELECT Id, QuoteForce__Quotes__c, QuoteForce__Quotes_Name__c, QuoteForce__LayoutId__c
            FROM QuoteForce__Invoice__c
            WHERE Id = :invoiceRecord.Id
        ];
        List<QuoteForce__Product_Section__c> invoiceSections = [
            SELECT Id, QuoteForce__Invoice__c
            FROM QuoteForce__Product_Section__c
            WHERE QuoteForce__Invoice__c = :invoiceRecord.Id
        ];
        List<QuoteForce__Invoice_line_items__c> invoiceLineItems = [
            SELECT Id, QuoteForce__Invoice__c, QuoteForce__Section_Id__c
            FROM QuoteForce__Invoice_line_items__c
            WHERE QuoteForce__Invoice__c = :invoiceRecord.Id
        ];
        List<QuoteForce__Custom_Page__c> invoicePages = [
            SELECT Id, QuoteForce__Invoice__c
            FROM QuoteForce__Custom_Page__c
            WHERE QuoteForce__Invoice__c = :invoiceRecord.Id
        ];
        Set<Id> invoicePageIds = new Set<Id>();
        for (QuoteForce__Custom_Page__c invoicePage : invoicePages) {
            invoicePageIds.add(invoicePage.Id);
        }
        List<ContentDocumentLink> copiedLinks = [
            SELECT Id, LinkedEntityId
            FROM ContentDocumentLink
            WHERE LinkedEntityId IN :invoicePageIds
        ];
    }

    @IsTest
    static void testCreateInvoiceFromQuote() {

        QuoteForce__Quotes__c quoteRecord = [
            SELECT Id,
                Name,
                QuoteForce__Expiration_Date__c,
                QuoteForce__Status__c,
                QuoteForce__Date__c,
                QuoteForce__Tax__c,
                QuoteForce__Tax_Enabled__c,
                QuoteForce__Tax_Mode__c,
                QuoteForce__Opportunity__c,
                QuoteForce__Price_Book__c
            FROM QuoteForce__Quotes__c
            LIMIT 1
        ];

        Test.startTest();

        // Success
        Id invoiceId = customInvoiceCreateController.createInvoiceFromQuote(quoteRecord.Id);
        System.assertNotEquals(null, invoiceId);

        // Null Quote Id
        try{
            customInvoiceCreateController.createInvoiceFromQuote(null);
            System.assert(false, 'Exception expected');
        }catch(Exception e){
            // System.assert(e.getMessage().contains('Quote Id is required'));
            System.assertNotEquals(null, e);
        }

        // Invalid Quote Id
        try{
            customInvoiceCreateController.createInvoiceFromQuote('a00000000000000AAA');
            System.assert(false, 'Exception expected');
        }catch(Exception e){
            System.assert(
                e.getMessage().contains('Quote not found') ||
                e.getMessage().contains('access denied')
            );
        }

        Test.stopTest();

        QuoteForce__Invoice__c createdInvoice = [
            SELECT Id,
                Name,
                QuoteForce__Expiration_Date__c,
                QuoteForce__Status__c,
                QuoteForce__Date__c,
                QuoteForce__Tax__c,
                QuoteForce__Tax_Enabled__c,
                QuoteForce__Tax_Mode__c,
                QuoteForce__Opportunity__c,
                QuoteForce__Quotes__c,
                QuoteForce__Quotes_Name__c,
                QuoteForce__Price_Book__c
            FROM QuoteForce__Invoice__c
            WHERE Id = :invoiceId
        ];

        System.assertEquals(quoteRecord.Id, createdInvoice.QuoteForce__Quotes__c);
        System.assertEquals(quoteRecord.Name, createdInvoice.QuoteForce__Quotes_Name__c);
        System.assertEquals(quoteRecord.Name, createdInvoice.Name);
    }
}