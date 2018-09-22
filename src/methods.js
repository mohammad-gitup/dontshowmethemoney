import crypto from 'crypto'
import axios from 'axios'

const monitoringFreq = 3000
let deliveryDelay = 3000
const feePool = 'feePool'
const depositPoolAddress = 'FundingPool'

/*
@param addresses, jobcoin addresses
Checks to see if provided jobcoin addresses are in fact new by checking against transaction history
*/

export const checkAddressNew = async (addresses) => {
    for (const address of addresses) {
        const transaction = await getTranscations(address)
        if(transaction.length === 0) {
            continue
        } else {
            return false
        }
    }

    return true
}

/*
@param getBalance, jobcoin address, string
Gets the total amount of jobcoins an address holds
*/

export const getBalance = async (address) => {
    const reqLink = `https://jobcoin.gemini.com/attention/api/addresses/${address}`
    const data = await axios.get(reqLink)
    const balance = data.data.balance
    return balance
}

/*
@param toAddress, jobcoin address, string
@param fromAddress, jobcoin address, string
@param amount, integer
Sends amount jobcoins from fromAddress to toAddress
*/

export const sendMoney = async (toAddress, fromAddress, amount) => {
    const reqLink = 'https://jobcoin.gemini.com/attention/api/transactions'
    if(amount <= 0) {
        const errorMsg = 'Account has no funds to transer'
        return {error: errorMsg}
    }

    const body = {
        fromAddress: fromAddress,
        toAddress: toAddress,
        amount: amount
    }
    const status = await axios.post(reqLink, body)
    return status
}

/*
@param address - jobcoin address, string
Returns array of transaction history for jobcoin addresses
*/

export const getTranscations = async (address) => {
    const reqLink = `https://jobcoin.gemini.com/attention/api/addresses/${address}`
    const data = await axios.get(reqLink)
    const transactions = data.data.transactions
    return transactions
}

/*
Generates random jobcoin address, inspiration from boilerplate
*/

export const generateDepositAddress = () => {
    const hash = crypto.createHash("sha256");
    return hash
      .update(`${Date.now() + Math.random()}`)
      .digest("hex")
      .substring(0, 8);
}

/*
@param depositAddress - jobcoin address, string
@param timeFrame - int
Polls at timeFrame interval to check if deposit is made into the newly generated deposit address
*/

export const monitorDepositAddress = async (depositAddress, timeFrame) => {
    const transactions = await getTranscations(depositAddress)
    for(let i = 0; i < transactions.length; i++) {
        const { fromAddress, toAddress, amount, timestamp } = transactions[i]
        const currentDate = new Date()
        const date = new Date(timestamp)
        const timediff = currentDate - date
        if(timediff <= 180000) {
            return true
        }
    }
    return false
}

/*
@param address - jobcoin address, string
Gets address balance and takes 2% fee from the balance and sends it to feePool
*/

export const collectFee = async (address) => {
    let amount = await getBalance(address)
    const feeCount = 0.02
    const fee = amount * feeCount
    await sendMoney(feePool, address, fee)
    return fee
}

/*
@param address - jobcoin addresses, array
@param verifyDeposit - callback triggers state on React Component
@param orderComplete - callback triggers state on React Component

Create Order takes in an array of addresses, generates deposit address, slightly randomizes percentages to which to distribute to addresses,
sets up polling for deposit address, and sends money to the pool, and then triggers pool to send to accounts
This is the main driver function which is called after a user submit a series of addresses
*/

export const createOrder = async (addresses, verifyDeposit, orderComplete) => {
    const orderDepositAddress = generateDepositAddress()
    const addressPortions = []

    let percentage = 1 / addresses.length

    addresses.forEach((address, i) => {
        const addressOrder = {address: address, chunk: percentage, balance: 0}
        addressPortions.push(addressOrder)
    })

    // slight randomization, adding a small percentage to next chunk
    // obviously not the most robust, however i figured this would be interesting
    for (let i = 1; i < addressPortions.length; i++) {
        let edge = Math.random() * (0.06 - 0.03) + 0.03
        addressPortions[i - 1].chunk -= edge
        addressPortions[i].chunk += edge
    }

    const order = {depositAddress: orderDepositAddress, addressPortions: addressPortions}
    const interval = setInterval(async () => {
        let deposited = await monitorDepositAddress(orderDepositAddress)
        if(deposited) {
            // clear interval before any asynchronous functions occur to prevent double requests
            clearInterval(interval)
            const fee = await collectFee(orderDepositAddress)
            let amount = await getBalance(orderDepositAddress)
            order.addressPortions.forEach((addressObj) => {
                addressObj.balance = addressObj.chunk * amount
            })
            await sendToPool(orderDepositAddress)
            verifyDeposit({amount: amount, fee: fee})
            await sendToAccounts(order, orderComplete)
        }
    }, monitoringFreq)

    return orderDepositAddress

}

/*
@param address - jobcoin address, string
Takes address and sends it to FundingPool account
*/

export const sendToPool = async (address) => {
    const addressBalance = await getBalance(address)
    const status = await sendMoney(depositPoolAddress, address, addressBalance)
    return status
}

/*
@param order - object
@param orderComplete - callback that triggers state on React Component
Collective order object which contains data on where and how much to send to user addresses, triggers front
*/

export const sendToAccounts = async (order, orderComplete) => {
    const depositPoolAddress = 'FundingPool'
    const orderSize = order.addressPortions.length - 1
    order.addressPortions.forEach(async (addressObj, i) => {
        let deliveryDelay = Math.random() * (6000 - 3000) + 3000
        const balance = addressObj.balance
        const address = addressObj.address
        setTimeout(async () => {
            await sendMoney(address, depositPoolAddress, balance)
            if(i === orderSize) {
                orderComplete()
            }
        }, deliveryDelay)

    })
}
