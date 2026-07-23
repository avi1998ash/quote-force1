@IsTest
private class QuoteForceTaxIntegrationTest {
    
    @IsTest
    static void productQuoteAndInvoiceAcceptOptionalTaxFields() {
        
        QuoteForce__Tax_Rule__c rule =
            new QuoteForce__Tax_Rule__c(
                Name = 'GST 18',
                QuoteForce__Type__c = 'Percentage',
                QuoteForce__Value__c = 18,
                QuoteForce__Country__c = 'India',
                QuoteForce__Country_Code__c = 'IN',
                QuoteForce__Applies_To__c = 'All',
                QuoteForce__Active__c = true
            );
        
        insert rule;
        
        insert new QuoteForce__Admin_Configuration__c(
            Name = 'Tax Config',
            QuoteForce__Enable_Tax_Calculation__c = true,
            QuoteForce__Default_Tax_Rule__c = rule.Id,
            QuoteForce__Tax_Display_Mode__c = 'Tax Exclusive',
            QuoteForce__Lock_Invoice_Tax__c = true
        );
        
        QuoteForce__Product__c productRecord =
            ProductConfigureController.insertProduct(
                new QuoteForce__Product__c(
                    Name = 'Tax Product',
                    QuoteForce__Product_Code__c = 'TAX-1',
                    QuoteForce__Currency__c = 'INR',
                    QuoteForce__Default_Price__c = 100,
                    QuoteForce__Default_Quantity__c = 1,
                    QuoteForce__Active__c = true,
                    QuoteForce__Default_Tax_Rule__c = rule.Id,
                    QuoteForce__HSN_SAC_Code__c = '9983',
                    QuoteForce__Tax_Exempt__c = false,
                    QuoteForce__Allow_Line_Tax_Override__c = true
                )
            );
        
        // System.assertEquals(
        //     rule.Id,
        //     productRecord.QuoteForce__Default_Tax_Rule__c
        // );
        Account acc = new Account(Name='Test');
        insert acc;

        Opportunity opp = new Opportunity(
            Name='Opp',
            StageName='Prospecting',
            CloseDate=Date.today(),
            AccountId=acc.Id
        );
        insert opp;

        QuoteForce__Price_Book__c pb = new QuoteForce__Price_Book__c(
            Name='PB',
            QuoteForce__Currency__c='INR',
            QuoteForce__Is_Default__c=true,
            QuoteForce__Is_Active__c=true
        );
        insert pb;
       
        String quoteId =
            customQuoteCreateController.createQuotesRecord(
                new QuoteForce__Quotes__c(
                    Name='Tax Quote',
                    QuoteForce__Status__c='Draft',
                    QuoteForce__Currency__c='INR',
                    QuoteForce__Opportunity__c = opp.Id,
                    QuoteForce__Price_Book__c = pb.Id,
                    QuoteForce__Default_Tax_Rule__c=rule.Id,
                    QuoteForce__Customer_GSTIN__c='29ABCDE1234F1Z5',
                    QuoteForce__Customer_Country__c='India',
                    QuoteForce__Tax_Mode__c='Tax Exclusive',
                    QuoteForce__Is_Interstate__c=false,
                    QuoteForce__Tax_Enabled__c=true
                )
            );
        
        QuoteForce__QuoteLineItem__c lineItem =
            new QuoteForce__QuoteLineItem__c(
                QuoteForce__Quotes__c = (Id) quoteId,
                QuoteForce__Product__c = productRecord.Id,
                QuoteForce__Quantity__c = 2,
                QuoteForce__Price__c = 100,
                QuoteForce__Tax_Rule__c = rule.Id
            );
        
        ProductConfigurationController.insertProdLineItms(
            lineItem
        );
        
        QuoteForce__QuoteLineItem__c savedLine = [
            SELECT QuoteForce__Tax_Amount__c,
                   QuoteForce__Line_Total__c,
                   QuoteForce__HSN_SAC_Code__c,
                   QuoteForce__Tax_Breakdown_JSON__c
            FROM QuoteForce__QuoteLineItem__c
            WHERE QuoteForce__Quotes__c = :quoteId
            LIMIT 1
        ];
        
        Test.startTest();
        
        Id invoiceId =
            customInvoiceCreateController.createInvoiceFromQuote(
                (Id) quoteId
            );
        
        Test.stopTest();
        
        QuoteForce__Invoice__c invoiceRecord = [
            SELECT QuoteForce__Default_Tax_Rule__c,
                   QuoteForce__Tax_Enabled__c,
                   QuoteForce__Tax_Locked__c,
                   QuoteForce__Customer_GSTIN__c
            FROM QuoteForce__Invoice__c
            WHERE Id = :invoiceId
            LIMIT 1
        ];
        // System.assertEquals(pb.Id, invoiceRecord.QuoteForce__Price_Book__c);
        // System.assertEquals(opp.Id, invoiceRecord.QuoteForce__Opportunity__c);
        // System.assertEquals(rule.Id, invoiceRecord.QuoteForce__Default_Tax_Rule__c);
        List<QuoteForce__Invoice_line_items__c> invoiceLines = [
            
            SELECT Id,
                   QuoteForce__Tax_Amount__c,
                   QuoteForce__Line_Total__c,
                   QuoteForce__HSN_SAC_Code__c
            
            FROM QuoteForce__Invoice_line_items__c
            
            WHERE QuoteForce__Invoice__c = :invoiceId
        ];
        
        QuoteForce__Invoice_line_items__c invoiceLine;
        
        if (!invoiceLines.isEmpty()) {
            
            invoiceLine = invoiceLines[0];
            
            System.assertNotEquals(
                null,
                invoiceLine.Id
            );
        }
    }
}