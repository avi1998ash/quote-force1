@IsTest
public class saveAsNewVersionTest {

    @IsTest
    static void testSaveAsNewVersion() {

        // Create Opportunity
        Opportunity opp = new Opportunity(
            Name = 'Test Opportunity',
            StageName = 'Prospecting',
            CloseDate = Date.today()
        );
        insert opp;

        // Create Original Quote
        QuoteForce__Quotes__c q = new QuoteForce__Quotes__c(
            Name = 'Test Quote',
            QuoteForce__Opportunity__c = opp.Id,
            QuoteForce__Expiration_Date__c = Date.today(),
            QuoteForce__Status__c = 'Draft',
            QuoteForce__State_Province__c = 'Rajasthan'
        );
        insert q;

        // Create Quote Line Item
        QuoteForce__QuoteLineItem__c qli =
            new QuoteForce__QuoteLineItem__c(
                QuoteForce__Quotes__c = q.Id,
                QuoteForce__Quantity__c = 2,
                QuoteForce__Price__c = 100
            );

        insert qli;

        Test.startTest();

        String newQuoteId =
            saveAsNewVersion.saveAsNewVersion(q.Id);

        Test.stopTest();

        System.debug('New Quote Version Id: ' + newQuoteId);
    }
}