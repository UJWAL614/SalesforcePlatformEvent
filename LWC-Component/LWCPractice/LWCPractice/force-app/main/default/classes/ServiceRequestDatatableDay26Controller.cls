public with sharing class ServiceRequestDatatableDay26Controller {
    
    @AuraEnabled(cacheable=true)
    public static  List<service_request__c> getServiceRequestList(){
            return [
               
                SELECT 
                Name,
                Priority__c ,
                Subject__c,
                External_System_ID__c, 
                Status__c, 
                Category__c,
                Description__c,
                account__c,
                account__r.name,
                Closed_Date__c,
                Email_Address__c
                FROM service_request__c
                ORDER BY CreatedDate DESC
                LIMIT 100
            ];

    }
}