@isTest
private class DashboardControllerTest {

    @isTest
    static void returnsDataWithQuotes() {
        QuoteForce__Quotes__c won = new QuoteForce__Quotes__c(
            QuoteForce__Status__c = 'Accepted', QuoteForce__Currency__c = 'USD',
            QuoteForce__First_Name__c = 'Alpha', QuoteForce__Last_Name__c = 'Corp');
        QuoteForce__Quotes__c lost = new QuoteForce__Quotes__c(
            QuoteForce__Status__c = 'Rejected', QuoteForce__Currency__c = 'USD');
        QuoteForce__Quotes__c open = new QuoteForce__Quotes__c(
            QuoteForce__Status__c = 'Draft', QuoteForce__Currency__c = 'USD');
        insert new List<QuoteForce__Quotes__c>{ won, lost, open };

        insert new List<QuoteForce__QuoteLineItem__c>{
            new QuoteForce__QuoteLineItem__c(QuoteForce__Quotes__c = won.Id,
                QuoteForce__Quantity__c = 2, QuoteForce__Price__c = 1000),
            new QuoteForce__QuoteLineItem__c(QuoteForce__Quotes__c = open.Id,
                QuoteForce__Quantity__c = 5, QuoteForce__Price__c = 300)
        };

        Test.startTest();
        DashboardController.DashboardData d = DashboardController.getDashboardData();
        Test.stopTest();

        System.assertEquals(3, d.totalQuotes, 'All quotes counted');
        System.assertEquals(1, d.wonCount, 'One won quote');
        System.assertEquals(1, d.lostCount, 'One lost quote');
        System.assert(d.achievedValue >= 2000, 'Won value rolled up from line items');
        System.assert(d.targetValue > 0, 'Target computed');
        System.assert(!d.statusStats.isEmpty(), 'Status breakdown built');
        System.assert(!d.highValueQuotes.isEmpty(), 'High value list built');
        System.assertEquals(8, d.monthly.size(), 'Eight month buckets');
    }

    @isTest
    static void returnsDataWithNoQuotes() {
        Test.startTest();
        DashboardController.DashboardData d = DashboardController.getDashboardData();
        Test.stopTest();

        System.assertEquals(0, d.totalQuotes, 'No quotes');
        System.assertEquals(1000000, d.targetValue, 'Default target when empty');
        System.assertEquals(8, d.monthly.size(), 'Eight empty month buckets');
    }
}