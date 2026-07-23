public with sharing class customInvoiceCreateController {
    
    @AuraEnabled(cacheable=true)
    public static List<Map<String, String>> getCountryPicklistValues() {
        List<Map<String, String>> countryList = new List<Map<String, String>>();
        
        Schema.DescribeFieldResult countryFieldDescribe = QuoteForce__Quotes__c.QuoteForce__Bill_To__CountryCode__s.getDescribe();
        List<Schema.PicklistEntry> countryPicklistValues = countryFieldDescribe.getPicklistValues();
        
        for (Schema.PicklistEntry countryEntry : countryPicklistValues) {
            Map<String, String> countryMap = new Map<String, String>();
            countryMap.put('label', countryEntry.getLabel());
            countryMap.put('value', countryEntry.getValue());
            countryList.add(countryMap);
        }
        return countryList;
    }
    
    @AuraEnabled(cacheable=true)
    public static List<Map<String, String>> getStatePicklistValues(String countryCode) {
        List<Map<String, String>> stateList = new List<Map<String, String>>();
        
        Map<String, List<String>> countryStateMap = new Map<String, List<String>>{
            'US' => new List<String>{'CA', 'TX'},
                'IN' => new List<String>{'MH', 'GJ'},
                    'CA' => new List<String>{'ON', 'BC'},
                        'AU' => new List<String>{'NSW', 'VIC'},
                            'GB' => new List<String>{'ENG', 'SCT'},
                                'DE' => new List<String>{'BW', 'BY'},
                                    'FR' => new List<String>{'IDF', 'NAQ'},
                                        'BR' => new List<String>{'SP', 'RJ'},
                                            'JP' => new List<String>{'13', '27'},
                                                'IT' => new List<String>{'LAZ', 'LOM'},
                                                    'CN' => new List<String>{'BJ', 'SH'},
                                                        'MX' => new List<String>{'CDMX', 'JAL'},
                                                            'ZA' => new List<String>{'GP', 'WC'},
                                                                'AR' => new List<String>{'C', 'B'},
                                                                    'ES' => new List<String>{'MD', 'CT'},
                                                                        'RU' => new List<String>{'MOW', 'SPE'},
                                                                            'KR' => new List<String>{'11', '26'},
                                                                                'NG' => new List<String>{'LA', 'FC'},
                                                                                    'NZ' => new List<String>{'AUK', 'WGN'},
                                                                                        'NL' => new List<String>{'NH', 'ZH'},
                                                                                            'SE' => new List<String>{'ST', 'VG'},
                                                                                                'CH' => new List<String>{'ZH', 'BE'},
                                                                                                    'BE' => new List<String>{'VBR', 'WHT'},
                                                                                                        'NO' => new List<String>{'03', '12'},
                                                                                                            'DK' => new List<String>{'84', '82'},
                                                                                                                'FI' => new List<String>{'ES', 'IS'},
                                                                                                                    'PL' => new List<String>{'MZ', 'DS'},
                                                                                                                        'PT' => new List<String>{'11', '13'},
                                                                                                                            'AT' => new List<String>{'9', '3'},
                                                                                                                                'IE' => new List<String>{'CW', 'DB'},
                                                                                                                                    'GR' => new List<String>{'I', 'A1'},
                                                                                                                                        'TR' => new List<String>{'34', '06'},
                                                                                                                                            'EG' => new List<String>{'C', 'GZ'},
                                                                                                                                                'KE' => new List<String>{'110', '200'},
                                                                                                                                                    'SA' => new List<String>{'01', '02'},
                                                                                                                                                        'AE' => new List<String>{'AZ', 'DU'},
                                                                                                                                                            'IL' => new List<String>{'TA', 'JM'},
                                                                                                                                                                'PK' => new List<String>{'PB', 'SD'},
                                                                                                                                                                    'BD' => new List<String>{'13', '27'},
                                                                                                                                                                        'MY' => new List<String>{'14', '01'},
                                                                                                                                                                            'TH' => new List<String>{'10', '63'},
                                                                                                                                                                                'VN' => new List<String>{'SG', 'HN'},
                                                                                                                                                                                    'PH' => new List<String>{'00', '03'},
                                                                                                                                                                                        'ID' => new List<String>{'JK', 'BT'},
                                                                                                                                                                                            'SG' => new List<String>{'01'},
                                                                                                                                                                                                'HK' => new List<String>{'HK'},
                                                                                                                                                                                                    'TW' => new List<String>{'TPQ', 'TXG'}
        };
            
            Map<String, String> stateLabelOverrides = new Map<String, String>{
                'BW' => 'Baden-Württemberg',
                    'BY' => 'Bavaria',
                    'IDF' => 'Île-de-France',
                    'NAQ' => 'Nouvelle-Aquitaine',
                    'SP' => 'São Paulo',
                    'RJ' => 'Rio de Janeiro',
                    'ST' => 'Stockholm',
                    'VG' => 'Västra Götaland'
                    };
                        
                        if (countryStateMap.containsKey(countryCode)) {
                            List<String> states = countryStateMap.get(countryCode);
                            for (String state : states) {
                                Map<String, String> stateMap = new Map<String, String>();
                                String label = stateLabelOverrides.containsKey(state) ? stateLabelOverrides.get(state) : state;
                                stateMap.put('label', label);
                                stateMap.put('value', state);
                                stateList.add(stateMap);
                            }
                        } else {
                            System.debug('No states available for country code: ' + countryCode);
                        }
        
        return stateList;
    }
    
    @AuraEnabled
    public static List<QuoteForce__Master_Template__c> getmasterTemplate(String templateName) {
        List<QuoteForce__Master_Template__c> mt = [
            SELECT Id, QuoteForce__Layout_Name__c, QuoteForce__IsDefault__c, QuoteForce__Pages_JSON__c, QuoteForce__Terms_Condition_doc__c, QuoteForce__Warranty_Doc__c
            FROM QuoteForce__Master_Template__c
            WHERE QuoteForce__Layout_Name__c = :templateName
            WITH USER_MODE
        ];
        return mt;
    }
    
    public static Opportunity getAddressFromAccount(Id accId) {
        Opportunity opp = [SELECT Id, Name FROM Opportunity WHERE Id = :accId WITH USER_MODE LIMIT 1];
        return opp;
    }
    
     @AuraEnabled
    public static Id createInvoiceRecord(QuoteForce__Invoice__c invoiceWrapMap) {

        try {

            if (invoiceWrapMap == null) {
                throw new AuraHandledException('Invoice data is required.');
            }

            if (!Schema.sObjectType.QuoteForce__Invoice__c.isCreateable()) {
                throw new AuraHandledException('You do not have permission to create Invoice.');
            }

            if (invoiceWrapMap.QuoteForce__Quotes__c != null) {

                List<QuoteForce__Quotes__c> quoteList = [ SELECT Id FROM QuoteForce__Quotes__c WHERE Id = :invoiceWrapMap.QuoteForce__Quotes__c WITH USER_MODE LIMIT 1];

                if (quoteList.isEmpty()) {
                    throw new AuraHandledException('Invalid Quote record.');
                }
            }

            // Validate Price Book Lookup
            if (invoiceWrapMap.QuoteForce__Price_Book__c != null) {

                List<Pricebook2> pbList = [ SELECT Id FROM Pricebook2 WHERE Id = :invoiceWrapMap.QuoteForce__Price_Book__c WITH USER_MODE LIMIT 1];

                if (pbList.isEmpty()) {
                    throw new AuraHandledException('Invalid Price Book.');
                }
            }

            // Validate Opportunity Lookup (if populated)
            if (invoiceWrapMap.QuoteForce__Opportunity__c != null) {

                List<Opportunity> oppList = [ SELECT Id FROM Opportunity WHERE Id = :invoiceWrapMap.QuoteForce__Opportunity__c WITH USER_MODE LIMIT 1];

                if (oppList.isEmpty()) {
                    throw new AuraHandledException('Invalid Opportunity.');
                }
            }

            // FLS Check
            List<QuoteForce__Invoice__c> sanitizedRecords =
                (List<QuoteForce__Invoice__c>) Security.stripInaccessible(
                    AccessType.CREATABLE,
                    new List<QuoteForce__Invoice__c>{ invoiceWrapMap }
                ).getRecords();

            if (sanitizedRecords.isEmpty()) {
                throw new AuraHandledException('No accessible fields to create Invoice.');
            }

            insert as user sanitizedRecords[0];

            return sanitizedRecords[0].Id;

        } catch (Exception ex) {
            throw new AuraHandledException(ex.getMessage());
        }
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // FIX: createInvoiceFromQuote ab sirf Invoice create karta hai.
    // createQuoteWithChildren ko YAHAN SE HATAYA GAYA HAI.
    // JS (autoCreateInvoiceFromQuote) ab khud explicitly createQuoteWithChildren
    // call karega — isse duplicate sections/line items ki problem khatam hogi.
    // ─────────────────────────────────────────────────────────────────────────
    @AuraEnabled
    public static Id createInvoiceFromQuote(Id quoteId) {

            // <-- CHANGED: Validate input
        if (quoteId == null) {
            throw new AuraHandledException('Quote Id is required.');
        }

        // <-- CHANGED: Object CRUD check
        if (!Schema.sObjectType.QuoteForce__Invoice__c.isCreateable()) {
            throw new AuraHandledException('You do not have permission to create Invoice records.');
        }

        Savepoint savepointRef = Database.setSavepoint();

        try {

            // <-- CHANGED: Verify the Quote exists and is accessible
            List<QuoteForce__Quotes__c> quoteList = [
                SELECT
                    Id,
                    Name,
                    QuoteForce__Expiration_Date__c,
                    QuoteForce__Date__c,
                    QuoteForce__Status__c,
                    QuoteForce__Tax__c,
                    QuoteForce__Tax_Enabled__c,
                    QuoteForce__Tax_Mode__c,
                    QuoteForce__Opportunity__c,
                    QuoteForce__Price_Book__c
                FROM QuoteForce__Quotes__c
                WHERE Id = :quoteId
                WITH USER_MODE
                LIMIT 1
            ];

            if (quoteList.isEmpty()) {
                throw new AuraHandledException('Quote not found or access denied.');
            }

            QuoteForce__Quotes__c sourceQuote = quoteList[0];

            QuoteForce__Invoice__c invoiceRecord = new QuoteForce__Invoice__c(
                Name = sourceQuote.Name,
                QuoteForce__Expiration_Date__c = sourceQuote.QuoteForce__Expiration_Date__c,
                QuoteForce__Status__c = sourceQuote.QuoteForce__Status__c,
                QuoteForce__Date__c = sourceQuote.QuoteForce__Date__c,
                QuoteForce__Tax__c = sourceQuote.QuoteForce__Tax__c,
                QuoteForce__Tax_Enabled__c = sourceQuote.QuoteForce__Tax_Enabled__c,
                QuoteForce__Tax_Mode__c = sourceQuote.QuoteForce__Tax_Mode__c,
                QuoteForce__Opportunity__c = sourceQuote.QuoteForce__Opportunity__c,
                QuoteForce__Quotes__c = sourceQuote.Id,
                QuoteForce__Quotes_Name__c = sourceQuote.Name,
                QuoteForce__Price_Book__c = sourceQuote.QuoteForce__Price_Book__c
            );

            // <-- CHANGED: Strip inaccessible fields
            SObjectAccessDecision accessDecision =
            Security.stripInaccessible(
                AccessType.CREATABLE,
                new List<QuoteForce__Invoice__c>{ invoiceRecord }
            );

            List<QuoteForce__Invoice__c> sanitizedRecords =
                (List<QuoteForce__Invoice__c>)accessDecision.getRecords();

            // <-- CHANGED: Validate strip result
            if (sanitizedRecords.isEmpty()) {
                throw new AuraHandledException(
                    'No accessible fields available to create Invoice.'
                );
            }

            // <-- CHANGED: USER MODE insert
            insert as user sanitizedRecords[0];

            return sanitizedRecords[0].Id;

        } catch (Exception ex) {

            Database.rollback(savepointRef);
            throw new AuraHandledException(ex.getMessage());
        }
    }
    
    @AuraEnabled
    public static Id updateInvoiceRecord(QuoteForce__Invoice__c invoiceWrapMap) {

        try {

            if (invoiceWrapMap == null || invoiceWrapMap.Id == null) {
                throw new AuraHandledException('Invoice Id is required.');
            }

            if (!Schema.sObjectType.QuoteForce__Invoice__c.isUpdateable()) {
                throw new AuraHandledException('You do not have permission to update Invoice.');
            }

            // Verify user has access to the Invoice
            List<QuoteForce__Invoice__c> invoiceList = [ SELECT Id FROM QuoteForce__Invoice__c WHERE Id = :invoiceWrapMap.Id WITH USER_MODE LIMIT 1];

            if (invoiceList.isEmpty()) {
                throw new AuraHandledException('Invoice not found or access denied.');
            }

            // Validate Quote Lookup
            if (invoiceWrapMap.QuoteForce__Quotes__c != null) {

                List<QuoteForce__Quotes__c> quoteList = [ SELECT Id FROM QuoteForce__Quotes__c WHERE Id = :invoiceWrapMap.QuoteForce__Quotes__c WITH USER_MODE LIMIT 1];

                if (quoteList.isEmpty()) {
                    throw new AuraHandledException('Invalid Quote record.');
                }
            }

            // Validate Price Book Lookup
            if (invoiceWrapMap.QuoteForce__Price_Book__c != null) {
                List<Pricebook2> pbList = [ SELECT Id FROM Pricebook2 WHERE Id = :invoiceWrapMap.QuoteForce__Price_Book__c WITH USER_MODE LIMIT 1];

                if (pbList.isEmpty()) {
                    throw new AuraHandledException('Invalid Price Book.');
                }
            }

            // Validate Opportunity Lookup
            if (invoiceWrapMap.QuoteForce__Opportunity__c != null) {

                List<Opportunity> oppList = [ SELECT Id FROM Opportunity WHERE Id = :invoiceWrapMap.QuoteForce__Opportunity__c WITH USER_MODE LIMIT 1 ];

                if (oppList.isEmpty()) {
                    throw new AuraHandledException('Invalid Opportunity.');
                }
            }

            List<QuoteForce__Invoice__c> sanitizedRecords =
                (List<QuoteForce__Invoice__c>) Security.stripInaccessible(
                    AccessType.UPDATABLE,
                    new List<QuoteForce__Invoice__c>{ invoiceWrapMap }
                ).getRecords();

            if (sanitizedRecords.isEmpty()) {
                throw new AuraHandledException('No accessible fields to update Invoice.');
            }

            update as user sanitizedRecords[0];

            return sanitizedRecords[0].Id;

        } catch (Exception ex) {
            throw new AuraHandledException(ex.getMessage());
        }
    }
    
    @AuraEnabled
    public static QuoteForce__Quotes__c getQuoteDetails(String recordId) {
        QuoteForce__Quotes__c quotelist = [
            SELECT Name, QuoteForce__Expiration_Date__c, QuoteForce__Status__c, QuoteForce__Tax__c, QuoteForce__Tax_Enabled__c, QuoteForce__Tax_Mode__c, QuoteForce__Opportunity__c, QuoteForce__LayoutId__c, QuoteForce__Price_Book__c,
            QuoteForce__Bill_To__Street__s, QuoteForce__Bill_To__City__s, QuoteForce__Bill_To__StateCode__s, QuoteForce__Bill_To__PostalCode__s, QuoteForce__Bill_To__CountryCode__s,
            QuoteForce__Ship_To__Street__s, QuoteForce__Ship_To__City__s, QuoteForce__Ship_To__StateCode__s, QuoteForce__Ship_To__PostalCode__s, QuoteForce__Ship_To__CountryCode__s,
            QuoteForce__First_Name__c, QuoteForce__Primary_Image__c, QuoteForce__Pages_JSON__c, QuoteForce__Secondary_Image__c, QuoteForce__Last_Name__c, QuoteForce__Layout_Name__c,
            QuoteForce__Street_Address__c, QuoteForce__City__c, QuoteForce__State_Province__c, QuoteForce__Zip_code_Postal_code__c, QuoteForce__Date__c, QuoteForce__Letter_from_the_owner__c
            FROM QuoteForce__Quotes__c
            WHERE Id = :recordId
            WITH USER_MODE
        ];
        System.debug('quotelist' + quotelist);
        return quotelist;
    }
    
    @AuraEnabled
    public static QuoteForce__Invoice__c getInvoiceDetails(String recordId) {
        QuoteForce__Invoice__c invoiceRecord = [
            SELECT Id, Name, QuoteForce__Expiration_Date__c, QuoteForce__Status__c, QuoteForce__Tax__c, QuoteForce__Tax_Enabled__c, QuoteForce__Tax_Mode__c, QuoteForce__Opportunity__c, QuoteForce__Quotes__c, QuoteForce__LayoutId__c, QuoteForce__Price_Book__c,
            QuoteForce__Bill_to__Street__s, QuoteForce__Bill_to__City__s, QuoteForce__Bill_to__StateCode__s, QuoteForce__Bill_to__PostalCode__s, QuoteForce__Bill_to__CountryCode__s,
            QuoteForce__Ship_To__Street__s, QuoteForce__Ship_To__City__s, QuoteForce__Ship_To__StateCode__s, QuoteForce__Ship_To__PostalCode__s, QuoteForce__Ship_To__CountryCode__s,
            QuoteForce__First_Name__c, QuoteForce__Primary_Image__c, QuoteForce__Pages_JSON__c, QuoteForce__Secondary_Image__c, QuoteForce__Last_Name__c, QuoteForce__Layout_Name__c,
            QuoteForce__Street_Address__c, QuoteForce__City__c, QuoteForce__State_Province__c, QuoteForce__Zip_code_Postal_code__c, QuoteForce__Date__c, QuoteForce__Letter_from_the_owner__c, QuoteForce__Quotes_Name__c
            FROM QuoteForce__Invoice__c
            WHERE Id = :recordId
            WITH USER_MODE
            LIMIT 1
        ];
        System.debug('invoiceRecord ' + invoiceRecord);
        return invoiceRecord;
    }
    
    @AuraEnabled
    public static Id createQuoteWithChildren(Id quoteId, Id invoiceId) {

        // ✅ Input validation  
        if (quoteId == null || invoiceId == null) {
            throw new IllegalArgumentException('quoteId and invoiceId must not be null.');
        }

        Savepoint sp = Database.setSavepoint();

        try {
            // ✅ CRUD check — Quote read access
            if (!Schema.sObjectType.QuoteForce__Quotes__c.isAccessible()) {
                throw new SecurityException('Insufficient access rights on QuoteForce__Quotes__c.');
            }

            QuoteForce__Quotes__c q = [
                SELECT Id, Name, QuoteForce__Expiration_Date__c, QuoteForce__Status__c, QuoteForce__Opportunity__c, QuoteForce__LayoutId__c, QuoteForce__Layout_Name__c, QuoteForce__Date__c,
                QuoteForce__First_Name__c, QuoteForce__Last_Name__c, QuoteForce__Price_Book__c, QuoteForce__Tax__c, QuoteForce__Tax_Enabled__c, QuoteForce__Tax_Mode__c,
                QuoteForce__Terms_Conditions__c, QuoteForce__Warranty__c, QuoteForce__Pages_JSON__c,
                QuoteForce__Street_Address__c, QuoteForce__City__c, QuoteForce__State_Province__c, QuoteForce__Zip_code_Postal_code__c,
                QuoteForce__Primary_Image__c, QuoteForce__Secondary_Image__c, QuoteForce__Letter_from_the_owner__c,
                QuoteForce__Bill_To__Street__s, QuoteForce__Bill_To__City__s, QuoteForce__Bill_To__StateCode__s, QuoteForce__Bill_To__PostalCode__s, QuoteForce__Bill_To__CountryCode__s,
                QuoteForce__Ship_To__Street__s, QuoteForce__Ship_To__City__s, QuoteForce__Ship_To__StateCode__s, QuoteForce__Ship_To__PostalCode__s, QuoteForce__Ship_To__CountryCode__s
                FROM QuoteForce__Quotes__c
                WHERE Id = :quoteId
                WITH USER_MODE
                LIMIT 1
            ];

            // ✅ CRUD check — Invoice update access
            if (!Schema.sObjectType.QuoteForce__Invoice__c.isUpdateable()) {
                throw new SecurityException('Insufficient access rights to update QuoteForce__Invoice__c.');
            }

            QuoteForce__Invoice__c inv = new QuoteForce__Invoice__c(
                Id                    = invoiceId,
                QuoteForce__Quotes__c             = quoteId,
                QuoteForce__Quotes_Name__c        = q.Name,
                QuoteForce__Expiration_Date__c    = q.QuoteForce__Expiration_Date__c,
                QuoteForce__Status__c             = q.QuoteForce__Status__c,
                QuoteForce__Opportunity__c        = q.QuoteForce__Opportunity__c,
                QuoteForce__LayoutId__c           = q.QuoteForce__LayoutId__c,
                QuoteForce__Layout_Name__c        = q.QuoteForce__Layout_Name__c,
                QuoteForce__First_Name__c         = q.QuoteForce__First_Name__c,
                QuoteForce__Last_Name__c          = q.QuoteForce__Last_Name__c,
                QuoteForce__Street_Address__c     = q.QuoteForce__Street_Address__c,
                QuoteForce__City__c               = q.QuoteForce__City__c,
                QuoteForce__State_Province__c     = q.QuoteForce__State_Province__c,
                QuoteForce__Zip_code_Postal_code__c = q.QuoteForce__Zip_code_Postal_code__c,
                QuoteForce__Date__c               = q.QuoteForce__Date__c,
                QuoteForce__Letter_from_the_owner__c = q.QuoteForce__Letter_from_the_owner__c,
                QuoteForce__Terms_Conditions__c   = q.QuoteForce__Terms_Conditions__c,
                QuoteForce__Warranty__c           = q.QuoteForce__Warranty__c,
                QuoteForce__Primary_Image__c      = q.QuoteForce__Primary_Image__c,
                QuoteForce__Secondary_Image__c    = q.QuoteForce__Secondary_Image__c,
                QuoteForce__Pages_JSON__c         = q.QuoteForce__Pages_JSON__c,
                QuoteForce__Price_Book__c         = q.QuoteForce__Price_Book__c,
                QuoteForce__Tax__c                = q.QuoteForce__Tax__c,
                QuoteForce__Tax_Enabled__c        = q.QuoteForce__Tax_Enabled__c,
                QuoteForce__Tax_Mode__c           = q.QuoteForce__Tax_Mode__c,
                QuoteForce__Bill_to__Street__s    = q.QuoteForce__Bill_To__Street__s,
                QuoteForce__Bill_to__City__s      = q.QuoteForce__Bill_To__City__s,
                QuoteForce__Bill_to__StateCode__s = q.QuoteForce__Bill_To__StateCode__s,
                QuoteForce__Bill_to__PostalCode__s= q.QuoteForce__Bill_To__PostalCode__s,
                QuoteForce__Bill_to__CountryCode__s = q.QuoteForce__Bill_To__CountryCode__s,
                QuoteForce__Ship_To__Street__s    = q.QuoteForce__Ship_To__Street__s,
                QuoteForce__Ship_To__City__s      = q.QuoteForce__Ship_To__City__s,
                QuoteForce__Ship_To__StateCode__s = q.QuoteForce__Ship_To__StateCode__s,
                QuoteForce__Ship_To__PostalCode__s= q.QuoteForce__Ship_To__PostalCode__s,
                QuoteForce__Ship_To__CountryCode__s = q.QuoteForce__Ship_To__CountryCode__s
            );

            // ✅ FLS Update fix — Invoice update
            List<QuoteForce__Invoice__c> sanitizedInv = (List<QuoteForce__Invoice__c>) Security.stripInaccessible(
                AccessType.UPDATABLE,
                new List<QuoteForce__Invoice__c>{ inv }
            ).getRecords();
            update as user sanitizedInv[0];

            // ✅ CRUD check — Invoice Line Items read/delete access
            if (!Schema.sObjectType.QuoteForce__Invoice_line_items__c.isAccessible() ||
                !Schema.sObjectType.QuoteForce__Invoice_line_items__c.isDeletable()) {
                throw new SecurityException('Insufficient access rights on QuoteForce__Invoice_line_items__c.');
            }

            // Delete existing invoice line items
            List<QuoteForce__Invoice_line_items__c> existingInvoiceLineItems = [
                SELECT Id FROM QuoteForce__Invoice_line_items__c
                WHERE QuoteForce__Invoice__c = :invoiceId
                WITH USER_MODE
            ];
            if (!existingInvoiceLineItems.isEmpty()) {
                delete as user existingInvoiceLineItems;
            }

            // ✅ CRUD check — Custom Page read/delete access
            if (!Schema.sObjectType.QuoteForce__Custom_Page__c.isAccessible() ||
                !Schema.sObjectType.QuoteForce__Custom_Page__c.isDeletable()) {
                throw new SecurityException('Insufficient access rights on QuoteForce__Custom_Page__c.');
            }

            // Delete existing invoice custom pages
            List<QuoteForce__Custom_Page__c> existingInvoicePages = [
                SELECT Id FROM QuoteForce__Custom_Page__c
                WHERE QuoteForce__Invoice__c = :invoiceId
                WITH USER_MODE
            ];
            if (!existingInvoicePages.isEmpty()) {
                delete as user existingInvoicePages;
            }

            // ✅ CRUD check — Product Section read/delete access
            if (!Schema.sObjectType.QuoteForce__Product_Section__c.isAccessible() ||
                !Schema.sObjectType.QuoteForce__Product_Section__c.isDeletable()) {
                throw new SecurityException('Insufficient access rights on QuoteForce__Product_Section__c.');
            }

            // Delete existing invoice sections
            List<QuoteForce__Product_Section__c> existingInvoiceSections = [
                SELECT Id FROM QuoteForce__Product_Section__c
                WHERE QuoteForce__Invoice__c = :invoiceId
                WITH USER_MODE
            ];
            if (!existingInvoiceSections.isEmpty()) {
                delete as user existingInvoiceSections;
            }

            // ✅ CRUD check — Quote Line Item read access
            if (!Schema.sObjectType.QuoteForce__QuoteLineItem__c.isAccessible()) {
                throw new SecurityException('Insufficient access rights on QuoteForce__QuoteLineItem__c.');
            }

            // Step 1: line items fetch
            List<QuoteForce__QuoteLineItem__c> quoteLineItems = [
                SELECT QuoteForce__Product_Bundle__c, QuoteForce__Product__c, QuoteForce__ProductCode__c, QuoteForce__Quantity__c, QuoteForce__Price__c, QuoteForce__Price_Book_Entry__c,
                QuoteForce__Unit_Of_Measurement__c, QuoteForce__Type__c, QuoteForce__Product_Section__c, QuoteForce__Currency__c
                FROM QuoteForce__QuoteLineItem__c
                WHERE QuoteForce__Quotes__c = :quoteId
                WITH USER_MODE
            ];

            Set<Id> sectionIdsWithProducts = new Set<Id>();
            for (QuoteForce__QuoteLineItem__c qli : quoteLineItems) {
                if (qli.QuoteForce__Product_Section__c != null) {
                    sectionIdsWithProducts.add(qli.QuoteForce__Product_Section__c);
                }
            }

            List<QuoteForce__Product_Section__c> quoteSections = new List<QuoteForce__Product_Section__c>();
            if (!sectionIdsWithProducts.isEmpty()) {
                quoteSections = [
                    SELECT Id, Name, QuoteForce__Notes__c
                    FROM QuoteForce__Product_Section__c
                    WHERE QuoteForce__Quotes__c = :quoteId
                    AND Id IN :sectionIdsWithProducts
                    WITH USER_MODE
                    ORDER BY CreatedDate ASC
                ];
            }

            Map<Id, Id> invoiceSectionIdByQuoteSectionId = new Map<Id, Id>();
            if (!quoteSections.isEmpty()) {

                // ✅ CRUD check — Product Section create access
                if (!Schema.sObjectType.QuoteForce__Product_Section__c.isCreateable()) {
                    throw new SecurityException('Insufficient access rights to create QuoteForce__Product_Section__c.');
                }

                List<QuoteForce__Product_Section__c> invoiceSectionsToInsert = new List<QuoteForce__Product_Section__c>();
                for (QuoteForce__Product_Section__c quoteSection : quoteSections) {
                    invoiceSectionsToInsert.add(new QuoteForce__Product_Section__c(
                        Name      = quoteSection.Name,
                        QuoteForce__Notes__c  = quoteSection.QuoteForce__Notes__c,
                        QuoteForce__Quotes__c = quoteId,
                        QuoteForce__Invoice__c= invoiceId
                    ));
                }

                // ✅ FLS Create fix — Product Sections
                List<QuoteForce__Product_Section__c> sanitizedSections = (List<QuoteForce__Product_Section__c>) Security.stripInaccessible(
                    AccessType.CREATABLE,
                    invoiceSectionsToInsert
                ).getRecords();
                insert as user sanitizedSections;

                for (Integer i = 0; i < quoteSections.size(); i++) {
                    invoiceSectionIdByQuoteSectionId.put(
                        quoteSections[i].Id,
                        sanitizedSections[i].Id  // sanitizedSections use karo, not original list
                    );
                }
            }

            List<QuoteForce__Invoice_line_items__c> invoiceLineItemsToInsert = new List<QuoteForce__Invoice_line_items__c>();
            for (QuoteForce__QuoteLineItem__c qli : quoteLineItems) {
                invoiceLineItemsToInsert.add(new QuoteForce__Invoice_line_items__c(
                    QuoteForce__Invoice__c         = invoiceId,
                    QuoteForce__Quotes__c          = quoteId,
                    QuoteForce__Product_Bundle__c  = qli.QuoteForce__Product_Bundle__c,
                    QuoteForce__Product_Custom__c  = qli.QuoteForce__Product__c,
                    QuoteForce__ProductCode__c     = qli.QuoteForce__ProductCode__c,
                    QuoteForce__Quantity__c        = qli.QuoteForce__Quantity__c,
                    QuoteForce__Price__c           = qli.QuoteForce__Price__c,
                    QuoteForce__Price_Book_Entry__c= qli.QuoteForce__Price_Book_Entry__c,
                    QuoteForce__Unit_Of_Measurement__c = qli.QuoteForce__Unit_Of_Measurement__c,
                    QuoteForce__Type__c            = qli.QuoteForce__Type__c,
                    QuoteForce__Currency__c        = qli.QuoteForce__Currency__c,
                    QuoteForce__Section_Id__c      = (invoiceSectionIdByQuoteSectionId.get(qli.QuoteForce__Product_Section__c) != null)
                    ? String.valueOf(invoiceSectionIdByQuoteSectionId.get(qli.QuoteForce__Product_Section__c))
                    : null
                ));
            }
            if (!invoiceLineItemsToInsert.isEmpty()) {

                // ✅ CRUD check — Invoice Line Item create access
                if (!Schema.sObjectType.QuoteForce__Invoice_line_items__c.isCreateable()) {
                    throw new SecurityException('Insufficient access rights to create QuoteForce__Invoice_line_items__c.');
                }

                // ✅ FLS Create fix — Invoice Line Items
                List<QuoteForce__Invoice_line_items__c> sanitizedLineItems = (List<QuoteForce__Invoice_line_items__c>) Security.stripInaccessible(
                    AccessType.CREATABLE,
                    invoiceLineItemsToInsert
                ).getRecords();
                insert as user sanitizedLineItems;
            }

            // ✅ CRUD check — Custom Page read access (for query below)
            if (!Schema.sObjectType.QuoteForce__Custom_Page__c.isAccessible()) {
                throw new SecurityException('Insufficient access rights on QuoteForce__Custom_Page__c.');
            }

            List<QuoteForce__Custom_Page__c> quoteCustomPages = [
                SELECT Name, QuoteForce__label__c, QuoteForce__selected__c, QuoteForce__editMode__c, QuoteForce__Text_Page__c, QuoteForce__toggle__c, QuoteForce__Type__c, QuoteForce__Currency__c,
                (SELECT ContentDocumentId FROM ContentDocumentLinks)
                FROM QuoteForce__Custom_Page__c
                WHERE QuoteForce__Quotes__c = :quoteId
                WITH USER_MODE
                ORDER BY CreatedDate ASC
            ];

            if (!quoteCustomPages.isEmpty()) {

                // ✅ CRUD check — Custom Page create access
                if (!Schema.sObjectType.QuoteForce__Custom_Page__c.isCreateable()) {
                    throw new SecurityException('Insufficient access rights to create QuoteForce__Custom_Page__c.');
                }

                List<QuoteForce__Custom_Page__c> invoiceCustomPagesToInsert = new List<QuoteForce__Custom_Page__c>();
                for (QuoteForce__Custom_Page__c quotePage : quoteCustomPages) {
                    invoiceCustomPagesToInsert.add(new QuoteForce__Custom_Page__c(
                        Name        = quotePage.Name,
                        QuoteForce__label__c    = quotePage.QuoteForce__label__c,
                        QuoteForce__selected__c = quotePage.QuoteForce__selected__c,
                        QuoteForce__editMode__c = quotePage.QuoteForce__editMode__c,
                        QuoteForce__Text_Page__c= quotePage.QuoteForce__Text_Page__c,
                        QuoteForce__toggle__c   = quotePage.QuoteForce__toggle__c,
                        QuoteForce__Type__c     = quotePage.QuoteForce__Type__c,
                        QuoteForce__Currency__c = quotePage.QuoteForce__Currency__c,
                        QuoteForce__Quotes__c   = quoteId,
                        QuoteForce__Invoice__c  = invoiceId
                    ));
                }

                // ✅ FLS Create fix — Custom Pages
                List<QuoteForce__Custom_Page__c> sanitizedPages = (List<QuoteForce__Custom_Page__c>) Security.stripInaccessible(
                    AccessType.CREATABLE,
                    invoiceCustomPagesToInsert
                ).getRecords();
                insert as user sanitizedPages;

                List<ContentDocumentLink> pageLinksToInsert = new List<ContentDocumentLink>();
                for (Integer i = 0; i < quoteCustomPages.size(); i++) {
                    if (i >= sanitizedPages.size()) break;        // sanitizedPages use karo
                    if (sanitizedPages[i].Id == null) continue;  // sanitizedPages use karo

                    for (ContentDocumentLink existingLink : quoteCustomPages[i].ContentDocumentLinks) {
                        if (existingLink.ContentDocumentId == null) continue;
                        pageLinksToInsert.add(new ContentDocumentLink(
                            ContentDocumentId = existingLink.ContentDocumentId,
                            LinkedEntityId    = sanitizedPages[i].Id,  // sanitizedPages use karo
                            ShareType         = 'V',
                            Visibility        = 'AllUsers'
                        ));
                    }
                }
                if (!pageLinksToInsert.isEmpty()) {

                    // ✅ CRUD check — ContentDocumentLink create access
                    if (!Schema.sObjectType.ContentDocumentLink.isCreateable()) {
                        throw new SecurityException('Insufficient access rights to create ContentDocumentLink.');
                    }

                    // ✅ FLS Create fix — ContentDocumentLink
                    List<ContentDocumentLink> sanitizedLinks = (List<ContentDocumentLink>) Security.stripInaccessible(
                        AccessType.CREATABLE,
                        pageLinksToInsert
                    ).getRecords();
                    insert as user sanitizedLinks;
                }
            }

            return q.QuoteForce__LayoutId__c;

        } catch (Exception e) {
            Database.rollback(sp);
            throw e;
        }
    }
    @AuraEnabled(cacheable=true)
    public static String getPdfPageUrl(String invoiceId) {
        PageReference pdfPage = Page.standardController;
        pdfPage.getParameters().put('id', invoiceId);
        return pdfPage.getUrl();
    }
}