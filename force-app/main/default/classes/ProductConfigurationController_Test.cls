@IsTest
public class ProductConfigurationController_Test {

    @testSetup
    static void setupData() {
        QuoteForce__Price_Book__c priceBookRecord = new QuoteForce__Price_Book__c(
            Name = 'Config Price Book',
            QuoteForce__Currency__c = 'USD',
            QuoteForce__Is_Active__c = true,
            QuoteForce__Is_Default__c = true
        );
        QuoteForce__Price_Book__c alternatePriceBook = new QuoteForce__Price_Book__c(
            Name = 'Config Alternate Price Book',
            QuoteForce__Currency__c = 'USD',
            QuoteForce__Is_Active__c = true,
            QuoteForce__Is_Default__c = false
        );
        insert new List<QuoteForce__Price_Book__c>{ priceBookRecord, alternatePriceBook };

        QuoteForce__Product__c primaryProduct = new QuoteForce__Product__c(
            Name = 'Config Product A',
            QuoteForce__Product_Code__c = 'CFG-001',
            QuoteForce__Default_Price__c = 120,
            QuoteForce__Default_Quantity__c = 2,
            QuoteForce__Currency__c = 'USD',
            QuoteForce__Active__c = true
        );
        QuoteForce__Product__c secondaryProduct = new QuoteForce__Product__c(
            Name = 'Config Product B',
            QuoteForce__Product_Code__c = 'CFG-002',
            QuoteForce__Default_Price__c = 80,
            QuoteForce__Default_Quantity__c = 1,
            QuoteForce__Currency__c = 'USD',
            QuoteForce__Active__c = true
        );
        insert new List<QuoteForce__Product__c>{ primaryProduct, secondaryProduct };

        QuoteForce__Price_Book_Entry__c primaryEntry = new QuoteForce__Price_Book_Entry__c(
            QuoteForce__Price_Book__c = priceBookRecord.Id,
            QuoteForce__Product__c = primaryProduct.Id,
            QuoteForce__Product_Code__c = 'CFG-001',
            QuoteForce__Currency__c = 'USD',
            QuoteForce__Unit_Price__c = 135,
            QuoteForce__Is_Active__c = true
        );
        QuoteForce__Price_Book_Entry__c secondaryEntry = new QuoteForce__Price_Book_Entry__c(
            QuoteForce__Price_Book__c = priceBookRecord.Id,
            QuoteForce__Product__c = secondaryProduct.Id,
            QuoteForce__Product_Code__c = 'CFG-002',
            QuoteForce__Currency__c = 'USD',
            QuoteForce__Unit_Price__c = 95,
            QuoteForce__Is_Active__c = true
        );
        QuoteForce__Price_Book_Entry__c alternatePrimaryEntry = new QuoteForce__Price_Book_Entry__c(
            QuoteForce__Price_Book__c = alternatePriceBook.Id,
            QuoteForce__Product__c = primaryProduct.Id,
            QuoteForce__Product_Code__c = 'CFG-001-ALT',
            QuoteForce__Currency__c = 'USD',
            QuoteForce__Unit_Price__c = 222,
            QuoteForce__Is_Active__c = true
        );
        insert new List<QuoteForce__Price_Book_Entry__c>{ primaryEntry, secondaryEntry, alternatePrimaryEntry };

        QuoteForce__Product_Bundle__c bundleRecord = new QuoteForce__Product_Bundle__c(
            Name = 'Config Bundle',
            QuoteForce__Description__c = 'Bundle for configuration',
            QuoteForce__Currency__c = 'USD',
            QuoteForce__Price_Book__c = alternatePriceBook.Id
        );
        insert bundleRecord;

        insert new QuoteForce__Product_Line_Items__c(
            QuoteForce__Product_Bundle__c = bundleRecord.Id,
            QuoteForce__Product__c = primaryProduct.Id,
            QuoteForce__Price__c = 75,
            QuoteForce__Quantity__c = 3,
            QuoteForce__Price_Book_Entry__c = alternatePrimaryEntry.Id
        );

        QuoteForce__Master_Template__c templateRecord = new QuoteForce__Master_Template__c(
            QuoteForce__Layout_Name__c = 'Config Layout'
        );
        insert templateRecord;

        QuoteForce__Quotes__c quoteRecord = new QuoteForce__Quotes__c(
            Name = 'Config Quote',
            QuoteForce__Currency__c = 'USD',
            QuoteForce__Price_Book__c = priceBookRecord.Id,
            QuoteForce__LayoutId__c = templateRecord.Id
        );
        insert quoteRecord;

        QuoteForce__Product_Section__c templateSection = new QuoteForce__Product_Section__c(
            Name = 'Template Section',
            QuoteForce__Master_Template__c = templateRecord.Id,
            QuoteForce__Notes__c = 'Template notes'
        );
        QuoteForce__Product_Section__c quoteSection = new QuoteForce__Product_Section__c(
            Name = 'Quote Section',
            QuoteForce__Quotes__c = quoteRecord.Id,
            QuoteForce__Notes__c = 'Quote notes'
        );
        insert new List<QuoteForce__Product_Section__c>{ templateSection, quoteSection };

        QuoteForce__QuoteLineItem__c templateLine = new QuoteForce__QuoteLineItem__c(
            QuoteForce__Master_Template__c = templateRecord.Id,
            QuoteForce__Product__c = primaryProduct.Id,
            QuoteForce__Product_Section__c = templateSection.Id,
            QuoteForce__Quantity__c = 1,
            QuoteForce__Price__c = 120
        );
        QuoteForce__QuoteLineItem__c quoteLine = new QuoteForce__QuoteLineItem__c(
            QuoteForce__Quotes__c = quoteRecord.Id,
            QuoteForce__Product__c = primaryProduct.Id,
            QuoteForce__Product_Section__c = quoteSection.Id,
            QuoteForce__Quantity__c = 2,
            QuoteForce__Price__c = 135,
            QuoteForce__Price_Book_Entry__c = primaryEntry.Id,
            QuoteForce__ProductCode__c = 'CFG-001',
            QuoteForce__Currency__c = 'USD',
            QuoteForce__Section_Id__c = String.valueOf(quoteSection.Id)
        );
        insert new List<QuoteForce__QuoteLineItem__c>{ templateLine, quoteLine };

        QuoteForce__Invoice__c invoiceRecord = new QuoteForce__Invoice__c(
            Name = 'Config Invoice',
            QuoteForce__Quotes__c = quoteRecord.Id,
            QuoteForce__Price_Book__c = priceBookRecord.Id
        );
        insert invoiceRecord;

        insert new QuoteForce__Product_Section__c(
            Name = 'Invoice Section',
            QuoteForce__Invoice__c = invoiceRecord.Id,
            QuoteForce__Notes__c = 'Invoice notes'
        );
    }

    @IsTest
    static void testProductDetailsAndBundleAccessors() {
        QuoteForce__Product__c productRecord = [SELECT Id FROM QuoteForce__Product__c WHERE Name = 'Config Product A' LIMIT 1];
        QuoteForce__Quotes__c quoteRecord = [SELECT Id FROM QuoteForce__Quotes__c WHERE Name = 'Config Quote' LIMIT 1];
        QuoteForce__Invoice__c invoiceRecord = [SELECT Id FROM QuoteForce__Invoice__c WHERE Name = 'Config Invoice' LIMIT 1];

        Test.startTest();
        QuoteForce__Product__c plainDetails = ProductConfigurationController.getProductDetails(productRecord.Id);
        ProductConfigurationController.ProductPricingDetails quoteDetails =
            ProductConfigurationController.getProductDetailsForContext(productRecord.Id, quoteRecord.Id, null);
        ProductConfigurationController.ProductPricingDetails invoiceDetails =
            ProductConfigurationController.getProductDetailsForContext(productRecord.Id, null, invoiceRecord.Id);
        List<ProductConfigurationController.ProductBundleWrapper> allBundles =
            ProductConfigurationController.getProductWithProductBundle();
        List<ProductConfigurationController.ProductBundleWrapper> usdBundles =
            ProductConfigurationController.getProductWithProductBundle('USD');
        List<ProductConfigurationController.ProductBundleWrapper> contextBundles =
            ProductConfigurationController.getProductWithProductBundleForContext(quoteRecord.Id, null);
        List<ProductConfigurationController.ProductBundleWrapper> invoiceContextBundles =
            ProductConfigurationController.getProductWithProductBundleForContext(null, invoiceRecord.Id);
        Test.stopTest();

        System.assertEquals('Config Product A', plainDetails.Name);
        System.assertEquals(135, quoteDetails.defaultPrice);
        System.assertEquals(135, invoiceDetails.defaultPrice);
        System.assertEquals(1, allBundles.size());
        System.assertEquals(1, usdBundles.size());
        System.assertEquals(1, contextBundles.size());
        System.assertEquals(1, invoiceContextBundles.size());
        System.assertEquals('Config Alternate Price Book', allBundles[0].PriceBookName);
        System.assertNotEquals(null, allBundles[0].PriceBookId);
        System.assertEquals(1, allBundles[0].ProductLineItemWrapperList.size());
        System.assertNotEquals(null, allBundles[0].ProductLineItemWrapperList[0].PriceBookEntryId);
        System.assertEquals(allBundles[0].PriceBookId, allBundles[0].ProductLineItemWrapperList[0].PriceBookId);
    }

    @IsTest
    static void testQuoteLineItemCreationAndCopyFlows() {
        QuoteForce__Quotes__c quoteRecord = [SELECT Id FROM QuoteForce__Quotes__c WHERE Name = 'Config Quote' LIMIT 1];
        QuoteForce__Master_Template__c templateRecord = [
            SELECT Id
            FROM QuoteForce__Master_Template__c
            WHERE QuoteForce__Layout_Name__c = 'Config Layout'
            LIMIT 1
        ];
        QuoteForce__Product__c primaryProduct = [SELECT Id FROM QuoteForce__Product__c WHERE Name = 'Config Product A' LIMIT 1];

        List<Map<String, Object>> createPayload = new List<Map<String, Object>>{
            new Map<String, Object>{
                'QuoteForce__Product__c' => primaryProduct.Id,
                'QuoteForce__Quantity__c' => Decimal.valueOf(4),
                'QuoteForce__Price__c' => Decimal.valueOf(110),
                'QuoteForce__Section_Id__c' => 'TEMP-SECTION'
            }
        };

        List<Map<String, Object>> quotePayload = new List<Map<String, Object>>{
            new Map<String, Object>{
                'prodId' => primaryProduct.Id,
                'Quantity' => Decimal.valueOf(5),
                'Price' => Decimal.valueOf(115),
                'MeasurementType' => 'EA',
                'Type' => 'Quote Product',
                'isQuote' => true,
                'sectionId' => 'QUOTE-SECTION'
            }
        };

        Test.startTest();
        ProductConfigurationController.createProductLineItem(quoteRecord.Id, createPayload);
        QuoteForce__Quotes__c quoteWithLines = ProductConfigurationController.fetchingQuoteLineFromQuotes(quoteRecord.Id);
        List<QuoteForce__QuoteLineItem__c> copiedItems =
            ProductConfigurationController.insertQuoteLineItemsFromTemplate(templateRecord.Id, quoteRecord.Id);
        ProductConfigurationController.createQuoteLineItems(quoteRecord.Id, quotePayload);
        Test.stopTest();
    }

    @IsTest
    static void testQuoteLineItemUpdatesAndDeletes() {
        QuoteForce__Quotes__c quoteRecord = [SELECT Id FROM QuoteForce__Quotes__c WHERE Name = 'Config Quote' LIMIT 1];
        QuoteForce__Product__c secondaryProduct = [SELECT Id FROM QuoteForce__Product__c WHERE Name = 'Config Product B' LIMIT 1];
        QuoteForce__QuoteLineItem__c lineItem = [
            SELECT Id, QuoteForce__Product__c
            FROM QuoteForce__QuoteLineItem__c
            WHERE QuoteForce__Quotes__c = :quoteRecord.Id
            LIMIT 1
        ];

        List<Map<String, Object>> updatePayload = new List<Map<String, Object>>{
            new Map<String, Object>{
                'id' => lineItem.Id,
                'prodId' => secondaryProduct.Id,
                'Quantity' => Decimal.valueOf(7),
                'Price' => Decimal.valueOf(95),
                'MeasurementType' => 'EA',
                'Type' => 'Quote Product',
                'isQuote' => true
            }
        };

        Test.startTest();
        ProductConfigurationController.updateQuoteLineItems(quoteRecord.Id, updatePayload);
        ProductConfigurationController.repriceQuoteLineItems(quoteRecord.Id);
        ProductConfigurationController.deleteQuoteLineItemsBySection(quoteRecord.Id, 'TEMP-SECTION');
        ProductConfigurationController.deleteQuoteLineItems(quoteRecord.Id, new List<Id>{ lineItem.Id });
        Test.stopTest();
    }

    @IsTest
    static void testSectionsAndConfigurationMutations() {
        QuoteForce__Quotes__c quoteRecord = [SELECT Id FROM QuoteForce__Quotes__c WHERE Name = 'Config Quote' LIMIT 1];
        QuoteForce__Master_Template__c templateRecord = [
            SELECT Id
            FROM QuoteForce__Master_Template__c
            WHERE QuoteForce__Layout_Name__c = 'Config Layout'
            LIMIT 1
        ];
        QuoteForce__Product__c productRecord = [SELECT Id FROM QuoteForce__Product__c WHERE Name = 'Config Product A' LIMIT 1];
        List<QuoteForce__Product_Section__c> quoteSections = [
            SELECT Id
            FROM QuoteForce__Product_Section__c
            WHERE QuoteForce__Quotes__c = :quoteRecord.Id
        ];

        QuoteForce__Product_Configuration__c productConfig = new QuoteForce__Product_Configuration__c(
            QuoteForce__Product__c = productRecord.Id,
            QuoteForce__Master_Template__c = templateRecord.Id,
            QuoteForce__Quantity__c = 3
        );

        QuoteForce__Product_Section__c manualSection = new QuoteForce__Product_Section__c(
            Name = 'Manual Section',
            QuoteForce__Master_Template__c = templateRecord.Id
        );

        QuoteForce__QuoteLineItem__c existingQuoteLine = [
            SELECT Id
            FROM QuoteForce__QuoteLineItem__c
            WHERE QuoteForce__Quotes__c = :quoteRecord.Id
            LIMIT 1
        ];

        Test.startTest();
        Boolean configCreated = ProductConfigurationController.createProductConfigs(
            new List<QuoteForce__Product_Configuration__c>{ productConfig }
        );
        QuoteForce__Product_Section__c createdSection = ProductConfigurationController.createProductSection(manualSection);
        List<QuoteForce__Product_Section__c> templateSections = ProductConfigurationController.getSectionData(templateRecord.Id);
        List<QuoteForce__Product_Section__c> fetchedQuoteSections = ProductConfigurationController.getSectionDataQuote(quoteRecord.Id);
        ProductConfigurationController.saveSections(new List<QuoteForce__Product_Section__c>{
            new QuoteForce__Product_Section__c(Name = 'Inserted Section', QuoteForce__Quotes__c = quoteRecord.Id),
            new QuoteForce__Product_Section__c(Id = quoteSections[0].Id, Name = 'Updated Quote Section')
        });
        ProductConfigurationController.saveQuoteLineItems(new List<QuoteForce__QuoteLineItem__c>{
            new QuoteForce__QuoteLineItem__c(QuoteForce__Quotes__c = quoteRecord.Id, QuoteForce__Product__c = productRecord.Id, QuoteForce__Quantity__c = 2, QuoteForce__Price__c = 15),
            new QuoteForce__QuoteLineItem__c(Id = existingQuoteLine.Id, QuoteForce__Quantity__c = 9, QuoteForce__Price__c = 44)
        });
        QuoteForce__Product_Section__c newTemplateSection = ProductConfigurationController.createNewSection(templateRecord.Id, 'Template Extra');
        QuoteForce__Product_Section__c newQuoteSection = ProductConfigurationController.createNewSectionQuote(quoteRecord.Id, 'Quote Extra');
        QuoteForce__Product_Section__c updatedSection = ProductConfigurationController.updateProdSection(
            new QuoteForce__Product_Section__c(Id = createdSection.Id, Name = 'Manual Section Updated')
        );
        QuoteForce__Product_Section__c orphanSectionToBind = new QuoteForce__Product_Section__c(
            Name = 'Unsaved Template Section'
        );
        insert orphanSectionToBind;
        QuoteForce__QuoteLineItem__c orphanLineToBind = new QuoteForce__QuoteLineItem__c(
            QuoteForce__Product__c = productRecord.Id,
            QuoteForce__Product_Section__c = orphanSectionToBind.Id,
            QuoteForce__Quantity__c = 1,
            QuoteForce__Price__c = 10,
            QuoteForce__Type__c = 'Master Template Product'
        );
        insert orphanLineToBind;
        ProductConfigurationController.SectionUpdate(templateRecord.Id);
        QuoteForce__Product_Section__c reboundSection = [
            SELECT QuoteForce__Master_Template__c
            FROM QuoteForce__Product_Section__c
            WHERE Id = :orphanSectionToBind.Id
        ];
        QuoteForce__QuoteLineItem__c reboundLine = [
            SELECT QuoteForce__Master_Template__c
            FROM QuoteForce__QuoteLineItem__c
            WHERE Id = :orphanLineToBind.Id
        ];
        System.assertEquals(templateRecord.Id, reboundSection.QuoteForce__Master_Template__c);
        System.assertEquals(templateRecord.Id, reboundLine.QuoteForce__Master_Template__c);

        QuoteForce__Product_Section__c orphanSectionToDelete = new QuoteForce__Product_Section__c(
            Name = 'Canceled Template Section'
        );
        insert orphanSectionToDelete;
        QuoteForce__QuoteLineItem__c orphanLineToDelete = new QuoteForce__QuoteLineItem__c(
            QuoteForce__Product__c = productRecord.Id,
            QuoteForce__Product_Section__c = orphanSectionToDelete.Id,
            QuoteForce__Quantity__c = 1,
            QuoteForce__Price__c = 10,
            QuoteForce__Type__c = 'Master Template Product'
        );
        insert orphanLineToDelete;
        ProductConfigurationController.SectionDeleteCancel();
        Test.stopTest();

        System.assertEquals(
            0,
            [SELECT COUNT() FROM QuoteForce__Product_Section__c WHERE Id = :orphanSectionToDelete.Id]
        );
        System.assertEquals(
            0,
            [SELECT COUNT() FROM QuoteForce__QuoteLineItem__c WHERE Id = :orphanLineToDelete.Id]
        );
    }

    @IsTest
    static void testSingleItemAndInvoiceFlows() {
        QuoteForce__Quotes__c quoteRecord = [SELECT Id FROM QuoteForce__Quotes__c WHERE Name = 'Config Quote' LIMIT 1];
        QuoteForce__Master_Template__c templateRecord = [
            SELECT Id
            FROM QuoteForce__Master_Template__c
            WHERE QuoteForce__Layout_Name__c = 'Config Layout'
            LIMIT 1
        ];
        QuoteForce__Invoice__c invoiceRecord = [SELECT Id FROM QuoteForce__Invoice__c WHERE Name = 'Config Invoice' LIMIT 1];
        QuoteForce__Product__c primaryProduct = [SELECT Id FROM QuoteForce__Product__c WHERE Name = 'Config Product A' LIMIT 1];
        QuoteForce__Product__c secondaryProduct = [SELECT Id FROM QuoteForce__Product__c WHERE Name = 'Config Product B' LIMIT 1];
        QuoteForce__Price_Book_Entry__c alternateEntry = [
            SELECT Id, QuoteForce__Unit_Price__c, QuoteForce__Price_Book__c
            FROM QuoteForce__Price_Book_Entry__c
            WHERE QuoteForce__Product_Code__c = 'CFG-001-ALT'
            LIMIT 1
        ];
        QuoteForce__Product_Section__c quoteSection = [
            SELECT Id
            FROM QuoteForce__Product_Section__c
            WHERE QuoteForce__Quotes__c = :quoteRecord.Id
            LIMIT 1
        ];
        QuoteForce__Product_Section__c invoiceSection = [
            SELECT Id
            FROM QuoteForce__Product_Section__c
            WHERE QuoteForce__Invoice__c = :invoiceRecord.Id
            LIMIT 1
        ];

        QuoteForce__QuoteLineItem__c insertCandidate = new QuoteForce__QuoteLineItem__c(
            QuoteForce__Quotes__c = quoteRecord.Id,
            QuoteForce__Product__c = primaryProduct.Id,
            QuoteForce__Quantity__c = 1,
            QuoteForce__Price__c = 20,
            QuoteForce__Price_Book_Entry__c = alternateEntry.Id
        );

        Test.startTest();
        QuoteForce__QuoteLineItem__c insertedLine = ProductConfigurationController.insertProdLineItms(insertCandidate);
        QuoteForce__QuoteLineItem__c insertedLineSnapshot = [
            SELECT QuoteForce__Price__c, QuoteForce__Price_Book_Entry__c, QuoteForce__ProductCode__c
            FROM QuoteForce__QuoteLineItem__c
            WHERE Id = :insertedLine.Id
        ];
        System.assertEquals(alternateEntry.Id, insertedLineSnapshot.QuoteForce__Price_Book_Entry__c);
        System.assertEquals(alternateEntry.QuoteForce__Unit_Price__c, insertedLineSnapshot.QuoteForce__Price__c);
        System.assertEquals('CFG-001-ALT', insertedLineSnapshot.QuoteForce__ProductCode__c);
        QuoteForce__QuoteLineItem__c updatedLine = ProductConfigurationController.updateProdLineItms(
            new QuoteForce__QuoteLineItem__c(
                Id = insertedLine.Id,
                QuoteForce__Product__c = secondaryProduct.Id,
                QuoteForce__Quantity__c = 2,
                QuoteForce__Price__c = 30
            )
        );
        QuoteForce__QuoteLineItem__c blankedLine = ProductConfigurationController.updateProdLineItms(
            new QuoteForce__QuoteLineItem__c(
                Id = insertedLine.Id,
                QuoteForce__Product__c = null,
                QuoteForce__Quantity__c = 3,
                QuoteForce__Price__c = 40
            )
        );
        QuoteForce__QuoteLineItem__c sectionTemplateLine = ProductConfigurationController.createNewSectionProduct(
            templateRecord.Id,
            quoteSection.Id
        );
        QuoteForce__QuoteLineItem__c sectionQuoteLine = ProductConfigurationController.createNewSectionProductQuote(
            quoteRecord.Id,
            quoteSection.Id
        );
        QuoteForce__Invoice_line_items__c invoiceLine = ProductConfigurationController.createNewSectionProductInvoice(
            invoiceRecord.Id,
            invoiceSection.Id
        );
        QuoteForce__Invoice_line_items__c insertedInvoiceLine = ProductConfigurationController.insertInvoiceLineItms(
            new QuoteForce__Invoice_line_items__c(
                QuoteForce__Invoice__c = invoiceRecord.Id,
                QuoteForce__Product_Custom__c = primaryProduct.Id,
                QuoteForce__Quantity__c = 2,
                QuoteForce__Price__c = 50,
                QuoteForce__Section_Id__c = String.valueOf(invoiceSection.Id),
                QuoteForce__Price_Book_Entry__c = alternateEntry.Id
            )
        );
        QuoteForce__Invoice_line_items__c insertedInvoiceLineSnapshot = [
            SELECT QuoteForce__Price__c, QuoteForce__Price_Book_Entry__c, QuoteForce__ProductCode__c
            FROM QuoteForce__Invoice_line_items__c
            WHERE Id = :insertedInvoiceLine.Id
        ];
        System.assertEquals(alternateEntry.Id, insertedInvoiceLineSnapshot.QuoteForce__Price_Book_Entry__c);
        System.assertEquals(alternateEntry.QuoteForce__Unit_Price__c, insertedInvoiceLineSnapshot.QuoteForce__Price__c);
        System.assertEquals('CFG-001-ALT', insertedInvoiceLineSnapshot.QuoteForce__ProductCode__c);
        QuoteForce__Invoice_line_items__c repricedInvoiceLine = ProductConfigurationController.updateInvoiceLineItms(
            new QuoteForce__Invoice_line_items__c(
                Id = insertedInvoiceLine.Id,
                QuoteForce__Quantity__c = 5,
                QuoteForce__Price__c = 70
            )
        );
        QuoteForce__Invoice_line_items__c blankedInvoiceLine = ProductConfigurationController.updateInvoiceLineItms(
            new QuoteForce__Invoice_line_items__c(
                Id = insertedInvoiceLine.Id,
                QuoteForce__Product__c = null,
                QuoteForce__Quantity__c = 6,
                QuoteForce__Price__c = 80
            )
        );
        List<ProductConfigurationController.InvoiceSectionWrapper> invoiceSections =
            ProductConfigurationController.getInvoiceSectionData(invoiceRecord.Id);
        ProductConfigurationController.repriceInvoiceLineItems(invoiceRecord.Id);
        ProductConfigurationController.deleteInvoiceLineItem(insertedInvoiceLine.Id);
        ProductConfigurationController.deleteInvoiceSection(invoiceSection.Id);
        ProductConfigurationController.deleteQuoteLineItem(insertedLine.Id);
        ProductConfigurationController.deleteSection(quoteSection.Id);
        Test.stopTest();
    }
}