@IsTest(seeAllData=false)
private class customQuoteCreateControllerTest {

    @IsTest
    static void testCountryAndStatePicklist() {
        Test.startTest();
        List<Map<String,String>> countries = customQuoteCreateController.getCountryPicklistValues();
        List<Map<String,String>> states = customQuoteCreateController.getStatePicklistValues('IN');
        Test.stopTest();
    }

    @IsTest
    static void testGetMasterTemplate() {
        QuoteForce__Master_Template__c mt = new QuoteForce__Master_Template__c(
            QuoteForce__Layout_Name__c = 'Test Layout'
        );
        insert mt;

        Test.startTest();
        List<QuoteForce__Master_Template__c> result = customQuoteCreateController.getmasterTemplate();
        Test.stopTest();
    }

    @IsTest
    static void testGetAddressFromAccount() {
        Account acc = new Account(Name = 'Test Account');
        insert acc;

        Opportunity opp = new Opportunity(
            Name = 'Test Opp',
            StageName = 'Prospecting',
            CloseDate = Date.today().addDays(10),
            AccountId = acc.Id
        );
        insert opp;

        Test.startTest();
        Opportunity result = customQuoteCreateController.getAddressFromAccount(opp.Id);
        Test.stopTest();
    }

    @IsTest
    static void testCreateQuoteRecord() {
        Map<String,Object> quoteData = new Map<String,Object>();
        quoteData.put('quoteName', 'Test Quote');
        quoteData.put('expirationDate', String.valueOf(Date.today()));
        quoteData.put('status', 'Draft');
        quoteData.put('tax', '10');

        Test.startTest();
        Id quoteId = customQuoteCreateController.createQuoteRecord(quoteData);
        Test.stopTest();
    }

    @IsTest
    static void testCreateQuotesRecord() {
        QuoteForce__Quotes__c q = new QuoteForce__Quotes__c();
        q.Name = 'Test Quote';

        Test.startTest();
        String quoteId = customQuoteCreateController.createQuotesRecord(q);
        Test.stopTest();

        System.debug('Returned Quote Id: ' + quoteId);
    }

    @IsTest
    static void testGetQuoteDetails() {
        QuoteForce__Quotes__c qt = new QuoteForce__Quotes__c(
            Name = 'Detail Quote'
        );
        insert qt;

        Test.startTest();
        QuoteForce__Quotes__c result = customQuoteCreateController.getQuoteDetails(qt.Id);
        Test.stopTest();
    }

    @IsTest
    static void testCreateQuoteWithChildren() {
        QuoteForce__Master_Template__c mt = new QuoteForce__Master_Template__c(
            QuoteForce__Layout_Name__c = 'Template Test'
        );
        insert mt;

        QuoteForce__Quotes__c qt = new QuoteForce__Quotes__c(
            Name = 'Test Quote'
        );
        insert qt;

        QuoteForce__Product__c prod = new QuoteForce__Product__c(
            Name = 'Test Product'
        );
        insert prod;

        QuoteForce__Product_Section__c sec = new QuoteForce__Product_Section__c(
            Name = 'Section 1',
            QuoteForce__Master_Template__c = mt.Id
        );
        insert sec;

        QuoteForce__QuoteLineItem__c qli = new QuoteForce__QuoteLineItem__c(
            QuoteForce__Product__c          = prod.Id,
            QuoteForce__Quantity__c         = 2,
            QuoteForce__Price__c            = 100,
            QuoteForce__Product_Section__c  = sec.Id
        );
        insert qli;

        QuoteForce__Custom_Page__c page = new QuoteForce__Custom_Page__c(
            Name                            = 'Page1',
            QuoteForce__label__c            = 'Custom Page 1',
            QuoteForce__Text_Page__c        = 'Template custom page body',
            QuoteForce__Type__c             = 'Upload File',
            QuoteForce__Master_Template__c  = mt.Id
        );
        insert page;

        mt.QuoteForce__Pages_JSON__c = JSON.serialize(new List<Object>{
            new Map<String, Object>{
                'Id'       => page.Id,
                'Name'     => 'Custom Page',
                'label'    => 'Custom Page 1',
                'selected' => false
            }
        });
        update mt;

        ContentVersion customPageFile = new ContentVersion(
            Title           = 'customPageDoc',
            PathOnClient    = 'customPageDoc.png',
            VersionData     = Blob.valueOf('custom-page-file')
        );
        insert customPageFile;

        customPageFile = [
            SELECT Id, ContentDocumentId
            FROM ContentVersion
            WHERE Id = :customPageFile.Id
        ];

        insert new ContentDocumentLink(
            ContentDocumentId   = customPageFile.ContentDocumentId,
            LinkedEntityId      = page.Id,
            ShareType           = 'V',
            Visibility          = 'AllUsers'
        );

        Test.startTest();
        Id newQuoteId = customQuoteCreateController.createQuoteWithChildren(mt.Id, qt.Id);
        Test.stopTest();

        List<QuoteForce__Custom_Page__c> clonedPages = [
            SELECT Id, QuoteForce__Quotes__c
            FROM QuoteForce__Custom_Page__c
            WHERE QuoteForce__Quotes__c = :newQuoteId WITH USER_MODE
        ];
      //  System.assertEquals(1, clonedPages.size(), 'Custom page should be cloned for quote');

        QuoteForce__Quotes__c clonedQuote = [
            SELECT QuoteForce__Pages_JSON__c
            FROM QuoteForce__Quotes__c
            WHERE Id = :newQuoteId WITH USER_MODE
        ];
       // System.assert(clonedQuote.QuoteForce__Pages_JSON__c.contains((String) clonedPages[0].Id), 'Quote JSON should use cloned custom page Id');
       // System.assert(!clonedQuote.QuoteForce__Pages_JSON__c.contains((String) page.Id), 'Quote JSON should not keep template custom page Id');

        List<ContentDocumentLink> clonedPageDocs = [
            SELECT Id
            FROM ContentDocumentLink
            WHERE LinkedEntityId = :clonedPages[0].Id
        ];
      //  System.assertEquals(1, clonedPageDocs.size(), 'Custom page attachment should be cloned to quote page');
    }
}