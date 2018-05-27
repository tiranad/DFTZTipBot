const {EventEmitter} = require('events');

export default class DepositEvent extends EventEmitter {

    constructor(time, rpc) {
        super();
        this.time = time;
        this.rpc = rpc;

        setInterval(() => this.checkDeposit(), time);
    }

    checkDeposit() {

    }


}
