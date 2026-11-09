import { LightningElement } from 'lwc';
import createServiceRequest
    from '@salesforce/apex/ServiceRequestLwcController.createServiceRequest';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
 
export default class ServiceRequestParent extends LightningElement {
 
    async handleFormSubmit(event) {
        const formData = event.detail;
 
        try {
            const newRecordId = await createServiceRequest({
                requestName: formData.requestName,
                externalSystemId: formData.externalSystemId,
                accountId: formData.accountId,
                subject: formData.subject,
                category: formData.category,
                priority: formData.priority,
                status: formData.status,
                description: formData.description,
                emailAddress: formData.emailAddress
            });
 
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success',
                    message: 'Service Request created. Record Id: ' + newRecordId,
                    variant: 'success'
                })
            );
 
            // Reset the child form after successful save.
            const childForm = this.template.querySelector(
                'c-service-request-form'
            );
            if (childForm) {
                childForm.resetForm();
            }
 
        } catch (error) {
            const message =
                error?.body?.message ||
                error?.message ||
                'Unknown error occurred';
 
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error creating Service Request',
                    message: message,
                    variant: 'error',
                    mode: 'sticky'
                })
            );
        }
    }
}
