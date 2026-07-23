public with sharing class QuoteForcePricingService {

    public class PricingResult {
        public Id productId;
        public Id priceBookId;
        public Id priceBookEntryId;
        public Decimal unitPrice;
        public String currencyCode;
        public String productCode;
    }

    private class PricingContext {
        public Id priceBookId;
        public String currencyCode;
    }

    public static String resolveQuoteCurrency(Id quoteId) {
        return resolveQuotePricingContext(quoteId).currencyCode;
    }

    public static Id resolveQuotePriceBookId(Id quoteId) {
        return resolveQuotePricingContext(quoteId).priceBookId;
    }

    public static Id resolveInvoicePriceBookId(Id invoiceId) {
        return resolveInvoicePricingContext(invoiceId).priceBookId;
    }

    public static Map<Id, Decimal> resolveQuoteProductPrices(Id quoteId, Set<Id> productIds) {
        Map<Id, Decimal> pricesByProductId = new Map<Id, Decimal>();
        for (PricingResult pricing : resolveQuoteProductPricing(quoteId, productIds).values()) {
            pricesByProductId.put(pricing.productId, pricing.unitPrice);
        }
        return pricesByProductId;
    }

    public static Map<Id, PricingResult> resolveQuoteProductPricing(Id quoteId, Set<Id> productIds) {
        return resolveProductPricing(resolveQuotePricingContext(quoteId), productIds);
    }

    public static Map<Id, PricingResult> resolveInvoiceProductPricing(Id invoiceId, Set<Id> productIds) {
        return resolveProductPricing(resolveInvoicePricingContext(invoiceId), productIds);
    }

    public static void syncCatalogProducts(List<QuoteForce__Product__c> productsToSync) {
        return;
    }

    private static PricingContext resolveQuotePricingContext(Id quoteId) {
        PricingContext context = new PricingContext();
        if (quoteId == null) {
            return context;
        }

        List<QuoteForce__Quotes__c> quoteRecords = [
            SELECT Id, QuoteForce__Currency__c, QuoteForce__Price_Book__c
            FROM QuoteForce__Quotes__c
            WHERE Id = :quoteId WITH USER_MODE
            LIMIT 1
        ];
        if (quoteRecords.isEmpty()) {
            return context;
        }
        QuoteForce__Quotes__c quoteRecord = quoteRecords[0];

        context.currencyCode = quoteRecord.QuoteForce__Currency__c;
        context.priceBookId = quoteRecord.QuoteForce__Price_Book__c != null
            ? quoteRecord.QuoteForce__Price_Book__c
            : resolveDefaultPriceBookId(context.currencyCode);
        return context;
    }

    private static PricingContext resolveInvoicePricingContext(Id invoiceId) {
        PricingContext context = new PricingContext();
        if (invoiceId == null) {
            return context;
        }

        List<QuoteForce__Invoice__c> invoiceRecords = [
            SELECT Id, QuoteForce__Price_Book__c, QuoteForce__Quotes__r.QuoteForce__Currency__c, QuoteForce__Quotes__r.QuoteForce__Price_Book__c
            FROM QuoteForce__Invoice__c
            WHERE Id = :invoiceId WITH USER_MODE
            LIMIT 1
        ];
        if (invoiceRecords.isEmpty()) {
            return context;
        }
        QuoteForce__Invoice__c invoiceRecord = invoiceRecords[0];

        context.currencyCode = invoiceRecord.QuoteForce__Quotes__r != null ? invoiceRecord.QuoteForce__Quotes__r.QuoteForce__Currency__c : null;
        if (invoiceRecord.QuoteForce__Price_Book__c != null) {
            context.priceBookId = invoiceRecord.QuoteForce__Price_Book__c;
        } else if (invoiceRecord.QuoteForce__Quotes__r != null && invoiceRecord.QuoteForce__Quotes__r.QuoteForce__Price_Book__c != null) {
            context.priceBookId = invoiceRecord.QuoteForce__Quotes__r.QuoteForce__Price_Book__c;
        } else {
            context.priceBookId = resolveDefaultPriceBookId(context.currencyCode);
        }
        return context;
    }

    private static Map<Id, PricingResult> resolveProductPricing(PricingContext context, Set<Id> productIds) {
        Map<Id, PricingResult> pricingByProductId = new Map<Id, PricingResult>();
        if (productIds == null || productIds.isEmpty()) {
            return pricingByProductId;
        }

        Map<Id, QuoteForce__Product__c> productById = new Map<Id, QuoteForce__Product__c>([
            SELECT Id, QuoteForce__Product_Code__c, QuoteForce__Default_Price__c, QuoteForce__Currency__c
            FROM QuoteForce__Product__c
            WHERE Id IN :productIds WITH USER_MODE]);

        Map<Id, QuoteForce__Price_Book_Entry__c> entryByProductId = new Map<Id, QuoteForce__Price_Book_Entry__c>();
        if (context.priceBookId != null) {
            for (QuoteForce__Price_Book_Entry__c entry : [
                SELECT Id, QuoteForce__Price_Book__c, QuoteForce__Product__c, QuoteForce__Product_Code__c, QuoteForce__Currency__c, QuoteForce__Unit_Price__c
                FROM QuoteForce__Price_Book_Entry__c
                WHERE QuoteForce__Price_Book__c = :context.priceBookId
                AND QuoteForce__Product__c IN :productIds
                AND QuoteForce__Is_Active__c = true WITH USER_MODE]) {
                if (!entryByProductId.containsKey(entry.QuoteForce__Product__c)) {
                    entryByProductId.put(entry.QuoteForce__Product__c, entry);
                }
            }
        }

        for (Id productId : productIds) {
            QuoteForce__Product__c productRecord = productById.get(productId);
            if (productRecord == null) {
                continue;
            }

            QuoteForce__Price_Book_Entry__c priceBookEntry = entryByProductId.get(productId);

            PricingResult pricing = new PricingResult();
            pricing.productId = productId;
            pricing.priceBookId = context.priceBookId;
            pricing.priceBookEntryId = priceBookEntry != null ? priceBookEntry.Id : null;
            pricing.unitPrice = priceBookEntry != null && priceBookEntry.QuoteForce__Unit_Price__c != null
                ? priceBookEntry.QuoteForce__Unit_Price__c
                : (productRecord.QuoteForce__Default_Price__c != null ? productRecord.QuoteForce__Default_Price__c : 0);
            pricing.currencyCode = String.isNotBlank(context.currencyCode)
                ? context.currencyCode
                : (priceBookEntry != null && String.isNotBlank(priceBookEntry.QuoteForce__Currency__c)
                    ? priceBookEntry.QuoteForce__Currency__c
                    : productRecord.QuoteForce__Currency__c);
            pricing.productCode = priceBookEntry != null && String.isNotBlank(priceBookEntry.QuoteForce__Product_Code__c)
                ? priceBookEntry.QuoteForce__Product_Code__c
                : productRecord.QuoteForce__Product_Code__c;

            pricingByProductId.put(productId, pricing);
        }

        return pricingByProductId;
    }

    private static Id resolveDefaultPriceBookId(String currencyCode) {
        List<QuoteForce__Price_Book__c> priceBooks;
        if (String.isBlank(currencyCode)) {
            priceBooks = [
                SELECT Id, QuoteForce__Currency__c
                FROM QuoteForce__Price_Book__c
                WHERE QuoteForce__Is_Active__c = true WITH USER_MODE
                ORDER BY QuoteForce__Is_Default__c DESC, CreatedDate ASC
                LIMIT 1
            ];
        } else {
            priceBooks = [
                SELECT Id, QuoteForce__Currency__c
                FROM QuoteForce__Price_Book__c
                WHERE QuoteForce__Is_Active__c = true
                AND (QuoteForce__Currency__c = :currencyCode OR QuoteForce__Currency__c = null) WITH USER_MODE
                ORDER BY QuoteForce__Is_Default__c DESC, CreatedDate ASC
                LIMIT 1
            ];
        }
        return priceBooks.isEmpty() ? null : priceBooks[0].Id;
    }
}