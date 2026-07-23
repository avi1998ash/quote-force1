({
    doInit : function(component, event, helper) {
        var pageRef = component.get("v.pageReference");

        if (pageRef && pageRef.state) {
            var state = pageRef.state;

            // Get values from URL
            var recordId = state.c__recordId;
            var objectApiName = state.c__objectApiName;

            component.set("v.recordId", recordId);
            component.set("v.objectApiName", objectApiName);

            console.log("Aura Record ID: " + recordId);
            console.log("Aura Object API Name: " + objectApiName);
        }
    }
})