@isTest
public class FileUploaderClassTest {
    
    @isTest
    static void testUploadFile(){
        
        QuoteForce__Quotes__c q = new QuoteForce__Quotes__c();
        q.Name  = 'test';
        
        insert q ;
    
    
    string body = ' test body ';
    string base64data = EncodingUtil.base64Encode(Blob.valueOf(body));
    
    Test.startTest();
    FileUploaderClass.uploadFile( base64Data, 'TestFile.txt', q.Id );
    
    test.stopTest();
}
}