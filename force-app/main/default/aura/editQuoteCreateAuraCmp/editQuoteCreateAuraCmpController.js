({
    doInit : function(component, event, helper) {
        var myPageRef = component.get("v.pageReference");
        if (myPageRef && myPageRef.state && myPageRef.state.recordId) {
            component.set("v.recordId", myPageRef.state.recordId);
        }
    }
})