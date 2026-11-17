import { LightningElement } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';

export default class ServiceRequestNavigation 
    extends NavigationMixin(LightningElement) {
    record_id   ='';
    handleIdChange(event) {
        this.recordId = event.target.value;
    }

    handleViewRecord() {
        this.navigateToRecord('view');
    }

    handleEditRecord() {
        this.navigateToRecord('edit');
    }
    navigateToRecord(mode) {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: this.recordId,
                objectApiName: 'service_request__c',
                actionName: mode
            }
        });
    }
}