@IsTest
private class InvoiceLineItemControllerTest {
    
    @testSetup
    static void createTestData(){
        
        Account acc = new Account(Name='Test Account');
        insert acc;
        
        Opportunity opp = new Opportunity(
            Name='Test Opportunity',
            StageName='Prospecting',
            CloseDate=Date.today(),
            AccountId=acc.Id
        );
        insert opp;
        
        QuoteForce__Quotes__c qt = new QuoteForce__Quotes__c(
            Name='Test Quote'
        );
        insert qt;
        
        QuoteForce__Invoice__c inv = new QuoteForce__Invoice__c(
            Name='Test Invoice',
            QuoteForce__Opportunity__c = opp.Id
        );
        insert inv;
        
        QuoteForce__Master_Template__c mt = new QuoteForce__Master_Template__c(
            QuoteForce__Layout_Name__c='Test Layout'
        );
        insert mt;
        
        QuoteForce__Custom_Page__c cp = new QuoteForce__Custom_Page__c(
            Name='Test Page',
            QuoteForce__Master_Template__c = mt.Id
        );
        insert cp;
    }
    
    
    @IsTest
    static void testInvoiceMethods(){
        
        QuoteForce__Invoice__c inv = [SELECT Id FROM QuoteForce__Invoice__c LIMIT 1];
        QuoteForce__Master_Template__c mt = [SELECT Id FROM QuoteForce__Master_Template__c LIMIT 1];
        QuoteForce__Custom_Page__c cp = [SELECT Id,Name FROM QuoteForce__Custom_Page__c LIMIT 1];
        QuoteForce__Quotes__c qt = [SELECT Id FROM QuoteForce__Quotes__c LIMIT 1];
        
        QuoteForce__Product__c prod = new QuoteForce__Product__c(
            Name = 'Test Product',
            QuoteForce__Default_Price__c = 100
        );
        insert prod;

        // Create Price Book
        QuoteForce__Price_Book__c pb = new QuoteForce__Price_Book__c(
            Name = 'Test Pricebook',
            QuoteForce__Currency__c = 'USD'
        );
        insert pb;

        // Create Pricebook Entry
        QuoteForce__Price_Book_Entry__c pbe = new QuoteForce__Price_Book_Entry__c(
            QuoteForce__Product__c = prod.Id,
            QuoteForce__Price_Book__c = pb.Id,
            QuoteForce__Unit_Price__c = 100,
            QuoteForce__Currency__c = 'USD'
        );
        insert pbe;
        
        Test.startTest();
        
        InvoiceLineItemController.getInvoiceDetails(inv.Id);
        
        InvoiceLineItemController.getLayouts();
        
        InvoiceLineItemController.getLayoutSearch('Test');
        InvoiceLineItemController.CreateMasterLayout(mt);
        
        
        InvoiceLineItemController.getLayoutRecord(mt.Id);
        
        InvoiceLineItemController.getCustomPage(mt.Id);
        
        InvoiceLineItemController.getCustomPageQuote(qt.Id);
        InvoiceLineItemController.CreateCustomPage(cp);
        
        
        cp.Name='Updated Page';
        InvoiceLineItemController.updateCustomPage(cp);
        
        InvoiceLineItemController.updateInvoiceDetails(
            inv.Id,
            'John',
            'Doe',
            'Street',
            'City',
            'State',
            '12345',
            'Test Layout',
            Date.today(),
            'Letter',
            '{}',
            pb.Id 
        );
        
        Test.stopTest();
    }
    
    
    @IsTest
    static void testAttachDocsToQuote() {
        
        QuoteForce__Quotes__c qt = new QuoteForce__Quotes__c(Name='Test Quote');
        insert qt;
        
        // File 1
        ContentVersion cv1 = new ContentVersion(
            Title='File1',
            PathOnClient='File1.txt',
            VersionData=Blob.valueOf('Test1')
        );
        insert cv1;
        
        // File 2
        ContentVersion cv2 = new ContentVersion(
            Title='File2',
            PathOnClient='File2.txt',
            VersionData=Blob.valueOf('Test2')
        );
        insert cv2;
        
        // File 3
        ContentVersion cv3 = new ContentVersion(
            Title='File3',
            PathOnClient='File3.txt',
            VersionData=Blob.valueOf('Test3')
        );
        insert cv3;
        
        // File 4
        ContentVersion cv4 = new ContentVersion(
            Title='File4',
            PathOnClient='File4.txt',
            VersionData=Blob.valueOf('Test4')
        );
        insert cv4;
        
        Id doc1 = [SELECT ContentDocumentId FROM ContentVersion WHERE Id=:cv1.Id].ContentDocumentId;
        Id doc2 = [SELECT ContentDocumentId FROM ContentVersion WHERE Id=:cv2.Id].ContentDocumentId;
        Id doc3 = [SELECT ContentDocumentId FROM ContentVersion WHERE Id=:cv3.Id].ContentDocumentId;
        Id doc4 = [SELECT ContentDocumentId FROM ContentVersion WHERE Id=:cv4.Id].ContentDocumentId;
        
        Test.startTest();
        
        InvoiceLineItemController.attachDocsToQuote(
            qt.Id,
            doc1,
            doc2,
            doc3,
            doc4
        );
        
       // InvoiceLineItemController.getQuoteDocumentLinks(qt.Id);
        
        Test.stopTest();
        
        
    }
    
    
    @IsTest
    static void testFileUploadMethods(){
        
        QuoteForce__Quotes__c qt = [SELECT Id FROM QuoteForce__Quotes__c LIMIT 1];
        
        String base64Data = EncodingUtil.base64Encode(Blob.valueOf('Test File'));
        
        Test.startTest();
        
        InvoiceLineItemController.uploadFile(base64Data,'test.txt',qt.Id);
        
        InvoiceLineItemController.uploadFileQuote(base64Data,'test2.txt',qt.Id);
        
        Test.stopTest();
    }
    
    
    @IsTest
    static void testLayoutUpdateDelete(){
        
        QuoteForce__Master_Template__c mt = [SELECT Id FROM QuoteForce__Master_Template__c LIMIT 1];
        QuoteForce__Custom_Page__c cp = [SELECT Id FROM QuoteForce__Custom_Page__c LIMIT 1];
        
        Test.startTest();
        
        InvoiceLineItemController.makeDefault(mt.Id);
        
        InvoiceLineItemController.UpdateMasterLayout(mt);
        InvoiceLineItemController.deleteLayout(mt.Id);
        
        InvoiceLineItemController.deleteLayoutPage(cp.Id);
        
        Test.stopTest();
    }
    
    @IsTest
    static void testUploadBulkFiles() {
        
        
        // Create record
        QuoteForce__Quotes__c qt = new QuoteForce__Quotes__c(Name='Test Quote');
        insert qt;
        
        // Create base64 file content
        String base64Data = EncodingUtil.base64Encode(Blob.valueOf('Test File Data'));
        
        // Prepare wrapper data
        List<Map<String,String>> files = new List<Map<String,String>>();
        
        Map<String,String> file1 = new Map<String,String>();
        file1.put('filename','file1.txt');
        file1.put('base64',base64Data);
        file1.put('recordId',qt.Id);
        
        Map<String,String> file2 = new Map<String,String>();
        file2.put('filename','file2.txt');
        file2.put('base64',base64Data);
        file2.put('recordId',qt.Id);
        
        files.add(file1);
        files.add(file2);
        
        // Convert to JSON
        String filesJson = JSON.serialize(files);
        
        Test.startTest();
        
        InvoiceLineItemController.uploadBulkFiles(filesJson, qt.Id);
        
        Test.stopTest();
        
        
    }

    @IsTest
    static void testSaveImageUrl(){
        
        
        QuoteForce__Quotes__c qt = [SELECT Id FROM QuoteForce__Quotes__c LIMIT 1];
        
        Test.startTest();
        
       /* InvoiceLineItemController.saveImageUrl(
            qt.Id,
            'Primary_Image__c',
            'https://testimage.com/img.png'
        );*/
        
        Test.stopTest();
        
        
    }
        
    
}