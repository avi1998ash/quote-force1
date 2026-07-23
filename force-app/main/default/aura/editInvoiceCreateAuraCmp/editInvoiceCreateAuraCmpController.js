({
    doInit : function(component, event, helper) {
        var myPageRef = component.get("v.pageReference");
        if (myPageRef && myPageRef.state) {
            var state = myPageRef.state;
            var recordId = state.c__recordId || state.recordId;
            if (recordId) {
                component.set("v.recordId", recordId);
            }
        }
    }
})