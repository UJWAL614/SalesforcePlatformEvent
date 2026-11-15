import { LightningElement, api } from 'lwc';

import { ShowToastEvent }
    from 'lightning/platformShowToastEvent';

export default class ServiceRequestEditForm
    extends LightningElement {

    @api recordId;

    handleSuccess(event) {

        const action = this.recordId
            ? 'updated'
            : 'created';

        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Success',
                message:
                    `Service Request ${action} successfully. Record ID: ${event.detail.id}`,
                variant: 'success'
            })
        );
    }

    handleError(event) {

        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Error',
                message: event.detail.message,
                variant: 'error'
            })
        );
    }
}