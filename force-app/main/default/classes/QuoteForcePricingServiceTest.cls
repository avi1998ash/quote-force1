@IsTest
private class QuoteForcePricingServiceTest {

    @testSetup
    static void setupData() {
        QuoteForce__Price_Book__c usdDefault = new QuoteForce__Price_Book__c(
            Name = 'USD Default',
            QuoteForce__Currency__c = 'USD',
            QuoteForce__Is_Active__c = true,
            QuoteForce__Is_Default__c = true
        );
        insert usdDefault;

        QuoteForce__Price_Book__c inrBook = new QuoteForce__Price_Book__c(
            Name = 'INR Book',
            QuoteForce__Currency__c = 'INR',
            QuoteForce__Is_Active__c = true,
            QuoteForce__Is_Default__c = true
        );
        insert inrBook;

        QuoteForce__Product__c firstProduct = new QuoteForce__Product__c(
            Name = 'Pricing Product One',
            QuoteForce__Product_Code__c = 'PRICE-001',
            QuoteForce__Default_Price__c = 40,
            QuoteForce__Currency__c = 'USD',
            QuoteForce__Active__c = true
        );
        QuoteForce__Product__c secondProduct = new QuoteForce__Product__c(
            Name = 'Pricing Product Two',
            QuoteForce__Product_Code__c = 'PRICE-002',
            QuoteForce__Default_Price__c = 80,
            QuoteForce__Currency__c = 'INR',
            QuoteForce__Active__c = true
        );
        insert new List<QuoteForce__Product__c>{ firstProduct, secondProduct };

        insert new List<QuoteForce__Price_Book_Entry__c>{
            new QuoteForce__Price_Book_Entry__c(
                QuoteForce__Price_Book__c = usdDefault.Id,
                QuoteForce__Product__c = firstProduct.Id,
                QuoteForce__Product_Code__c = 'PRICE-001',
                QuoteForce__Currency__c = 'USD',
                QuoteForce__Unit_Price__c = 55,
                QuoteForce__Is_Active__c = true
            ),
            new QuoteForce__Price_Book_Entry__c(
                QuoteForce__Price_Book__c = inrBook.Id,
                QuoteForce__Product__c = secondProduct.Id,
                QuoteForce__Product_Code__c = 'PRICE-002',
                QuoteForce__Currency__c = 'INR',
                QuoteForce__Unit_Price__c = 95,
                QuoteForce__Is_Active__c = true
            )
        };

        QuoteForce__Quotes__c explicitQuote = new QuoteForce__Quotes__c(
            Name = 'Explicit Price Book Quote',
            QuoteForce__Currency__c = 'USD',
            QuoteForce__Price_Book__c = usdDefault.Id
        );
        QuoteForce__Quotes__c fallbackQuote = new QuoteForce__Quotes__c(
            Name = 'Fallback Quote',
            QuoteForce__Currency__c = 'INR'
        );
        insert new List<QuoteForce__Quotes__c>{ explicitQuote, fallbackQuote };

        QuoteForce__Invoice__c explicitInvoice = new QuoteForce__Invoice__c(
            Name = 'Explicit Invoice',
            QuoteForce__Quotes__c = explicitQuote.Id,
            QuoteForce__Price_Book__c = usdDefault.Id
        );
        QuoteForce__Invoice__c inheritedInvoice = new QuoteForce__Invoice__c(
            Name = 'Inherited Invoice',
            QuoteForce__Quotes__c = fallbackQuote.Id
        );
        insert new List<QuoteForce__Invoice__c>{ explicitInvoice, inheritedInvoice };
    }

    @IsTest
    static void testQuotePricingResolvers() {
        QuoteForce__Quotes__c explicitQuote = [
            SELECT Id
            FROM QuoteForce__Quotes__c
            WHERE Name = 'Explicit Price Book Quote'
            LIMIT 1
        ];
        QuoteForce__Quotes__c fallbackQuote = [
            SELECT Id
            FROM QuoteForce__Quotes__c
            WHERE Name = 'Fallback Quote'
            LIMIT 1
        ];
        List<QuoteForce__Product__c> products = [
            SELECT Id
            FROM QuoteForce__Product__c
            ORDER BY Name ASC
        ];
        Set<Id> productIds = new Set<Id>();
        for (QuoteForce__Product__c productRecord : products) {
            productIds.add(productRecord.Id);
        }

        Test.startTest();
        String quoteCurrency = QuoteForcePricingService.resolveQuoteCurrency(explicitQuote.Id);
        Id explicitPriceBookId = QuoteForcePricingService.resolveQuotePriceBookId(explicitQuote.Id);
        Id fallbackPriceBookId = QuoteForcePricingService.resolveQuotePriceBookId(fallbackQuote.Id);
        Map<Id, Decimal> pricesByProduct = QuoteForcePricingService.resolveQuoteProductPrices(explicitQuote.Id, productIds);
        Map<Id, QuoteForcePricingService.PricingResult> explicitPricing =
            QuoteForcePricingService.resolveQuoteProductPricing(explicitQuote.Id, productIds);
        Map<Id, QuoteForcePricingService.PricingResult> emptyPricing =
            QuoteForcePricingService.resolveQuoteProductPricing(explicitQuote.Id, new Set<Id>());
        QuoteForcePricingService.syncCatalogProducts(new List<QuoteForce__Product__c>());
        Test.stopTest();
    }

    @IsTest
    static void testInvoicePricingResolvers() {
        QuoteForce__Invoice__c explicitInvoice = [
            SELECT Id
            FROM QuoteForce__Invoice__c
            WHERE Name = 'Explicit Invoice'
            LIMIT 1
        ];
        QuoteForce__Invoice__c inheritedInvoice = [
            SELECT Id
            FROM QuoteForce__Invoice__c
            WHERE Name = 'Inherited Invoice'
            LIMIT 1
        ];
        QuoteForce__Product__c firstProduct = [
            SELECT Id
            FROM QuoteForce__Product__c
            WHERE Name = 'Pricing Product One'
            LIMIT 1
        ];
        QuoteForce__Product__c secondProduct = [
            SELECT Id
            FROM QuoteForce__Product__c
            WHERE Name = 'Pricing Product Two'
            LIMIT 1
        ];

        Test.startTest();
        Id explicitPriceBookId = QuoteForcePricingService.resolveInvoicePriceBookId(explicitInvoice.Id);
        Id inheritedPriceBookId = QuoteForcePricingService.resolveInvoicePriceBookId(inheritedInvoice.Id);
        Map<Id, QuoteForcePricingService.PricingResult> invoicePricing =
            QuoteForcePricingService.resolveInvoiceProductPricing(
                inheritedInvoice.Id,
                new Set<Id>{ firstProduct.Id, secondProduct.Id }
            );
        Test.stopTest();
    }
}