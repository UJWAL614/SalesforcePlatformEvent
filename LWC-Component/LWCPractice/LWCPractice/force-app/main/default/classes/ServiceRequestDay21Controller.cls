public with sharing class ServiceRequestDay21Controller {

    // Get the latest 10 Service Requests
    @AuraEnabled(cacheable=true)
    public static List<Service_Request__c> getServiceRequests() {

        return [
            SELECT Id, Name, External_System_ID__c,
                   Subject__c, Category__c,
                   Priority__c, Status__c,
                   CreatedDate
            FROM Service_Request__c
            ORDER BY CreatedDate DESC
            LIMIT 10
        ];
    }

    // Create a Service Request
    @AuraEnabled
    public static Id createServiceRequest(
        Service_Request__c requestData
    ) {

        if (requestData == null) {
            throw new AuraHandledException(
                'Please provide Service Request details.'
            );
        }

        if (String.isBlank(requestData.Name)) {
            throw new AuraHandledException(
                'Service Request Name is required.'
            );
        }

        if (String.isBlank(requestData.External_System_ID__c)) {
            throw new AuraHandledException(
                'External System ID is required.'
            );
        }

        if (requestData.Account__c == null) {
            throw new AuraHandledException(
                'Account is required.'
            );
        }

        if (requestData.Status__c == 'Closed') {
            requestData.Closed_Date__c = System.now();
        }

        insert requestData;

        return requestData.Id;
    }
}