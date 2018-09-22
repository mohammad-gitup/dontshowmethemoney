import React, { Component } from 'react';

import './App.css';
import { monitorDepositAddress, sendToPool, createOrder, generateDepositAddress, checkAddressNew } from './methods.js'

import {Timeline, TimelineEvent} from 'react-event-timeline'
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';


class App extends Component {
    constructor(props) {
       super(props)
       this.state = {
           addresses: '',
           depositAddress: '',
           notNew: false,
           notEnough: false,
           showOrder: false,
           depositMade: false,
           depositAmount: 0,
           orderFee: 0,
           orderComplete: false
       }
       this.handleAddress = this.handleAddress.bind(this);
       this.handleSubmit = this.handleSubmit.bind(this)
       this.verifyDeposit = this.verifyDeposit.bind(this)
       this.orderComplete = this.orderComplete.bind(this)
    }

    handleAddress = (event) => {
      this.setState({
          addresses: event.target.value
      })
      let addresses = this.state.addresses

    }

    verifyDeposit = async (total) => {
        const { amount, fee } = total
        this.setState({
            depositMade: true,
            depositAmount: amount,
            orderFee: fee
        })
    }

    handleSubmit = async () => {
        let addresses = this.state.addresses
        let addressArray = addresses.split(',').map((address) => {
            return address.trim()
        })

        let isValid = true

        if(addressArray.length <= 1) {
            this.setState({
                notEnough: true
            })
            isValid = false
            return isValid
        }

        const areNew = await checkAddressNew(addressArray)
        if(!areNew) {
            this.setState({
                notNew: true
            })
            return false
        }

        this.createOrder(addressArray)

        this.setState({
            showOrder: true,
            notNew: false,
            notEnough: false
        })

    }

    createOrder = async (addresses) => {
        const depositAddress = await createOrder(addresses, this.verifyDeposit, this.orderComplete)
        this.setState({
            depositAddress: depositAddress
        })
    }

    orderComplete = () => {
        this.setState({
            orderComplete: true
        })
    }



  render() {
    return (<div className="App">
      <header className="App-header">
        <h1 className="App-title">Jobcoin Mixer</h1>
        <p className="App-intro">The propietary tool that preserves your financial history on the Jobcoin Network. ICO coming soon.</p>
      </header>
      <form>
          <TextField id="outlined-full-width" label="Addresses Input" style={{
              marginLeft: 8,
              marginRight: 8
          }} placeholder="Enter addresses here" helperText="Split each address with commas -" value={this.state.addresses} onChange={(event) => this.handleAddress(event)} fullWidth={true} margin="normal" variant="outlined" />
          <Button variant="contained" color="primary" onClick={this.handleSubmit}>
              Create Order
          </Button>
         {this.state.notNew ? <p><i>Please use new addresses</i></p> : <p />}
         {this.state.notEnough ? <p><i>Please use more than one address</i></p> : <p />}
      </form>
       {this.state.showOrder ?  <Timeline>
          <TimelineEvent title="Created order"
                          icon={<i className="material-icons md-18">check</i>}
           >
               Send your deposit to <b>{this.state.depositAddress}</b><br />
               Payment will be distributed to these Jobcoin addresses: <b>{this.state.addresses}</b>.
           </TimelineEvent>
           {this.state.depositMade ? <TimelineEvent title="Deposit was made!"
                          icon={<i className="material-icons md-18">check</i>}
           >
               The deposit address recieved <b>{this.state.depositAmount} Jobcoins</b> and sent it to the pool.<br />
               There was a 2% fee equaling <b>{this.state.orderFee} Jobcoins</b>  taken from the deposit.
           </TimelineEvent> : <p />}
           {this.state.orderComplete ? <TimelineEvent title="Order was completed!"
                          icon={<i className="material-icons md-18">check</i>}
           >
               The deposits are in your account! Congratulations.
           </TimelineEvent> : <p />}
       </Timeline> : null}
    </div>);
  }
}

export default App;
