@isTest
public class editQuoteControllerTest {

    @isTest
    static void testControllerInitialization() {

        Id testRecordId =
            Id.valueOf('001000000000000AAA');

        PageReference pageRef =
            new PageReference('/apex/dummyPage');

        pageRef.getParameters().put(
            'Id',
            testRecordId
        );

        pageRef.getParameters().put(
            'objectApiName',
            'QuoteForce__Quotes__c'
        );

        Test.setCurrentPage(pageRef);

        Test.startTest();

        editQuoteController controller =
            new editQuoteController();

        Test.stopTest();
    }
}