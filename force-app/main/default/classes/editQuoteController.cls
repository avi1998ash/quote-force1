public with sharing class editQuoteController {
    public Id currentRecId {get;set;}
    public string currentObjectName {get;set;}
    public editQuoteController(){
        Map<String, String> params = System.currentPagereference().getParameters();
        currentRecId = QuoteForceSecurityUtil.requireId(params.get('Id'), 'record Id');
        currentObjectName = QuoteForceSecurityUtil.resolveObjectApiName(params.get('objectName'));
    }
}