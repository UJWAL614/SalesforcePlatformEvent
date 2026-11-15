public with sharing class serviceRequestDay23Class {
    // Create a Service Request
    @AuraEnabled
    public static id createServiceRequest(Service_Request__c input) {
        if (input == null) {
            throw new AuraHandledException(
                'Please provide Service Request details.'
            );
        }

        if (String.isBlank(input.Name)) {
            throw new AuraHandledException(
                'Service Request Name is required.'
            );
        }
        insert input;
        return input.Id;
}
}