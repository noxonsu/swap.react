import React, { PureComponent, Fragment } from 'react'

import Swap from 'swap.swap'

import cssModules from 'react-css-modules'
import styles from './Swap.scss'
import { isMobile } from 'react-device-detect'

import { connect } from 'redaction'
import helpers, { constants, links } from 'helpers'
import { localisedUrl } from 'helpers/locale'

import actions from 'redux/actions'

import { injectIntl, FormattedMessage } from 'react-intl'

import Share from './Share/Share'
import SwapList from './SwapList/SwapList'
import { Button } from 'components/controls'
import SwapController from './SwapController'
import BtcScript from './BtcScript/BtcScript'
import DeleteSwapAfterEnd from './DeleteSwapAfterEnd'
import FeeControler from './FeeControler/FeeControler'
import SwapProgress from './SwapProgress/SwapProgress'
import EmergencySave from './EmergencySave/EmergencySave'
import DepositWindow from './DepositWindow/DepositWindow'


@injectIntl
@connect(({
  user: { ethData, btcData, /* bchData, */ tokensData, eosData, telosData, nimData, usdtData, ltcData },
  ipfs: { peer },
}) => ({
  items: [ ethData, btcData, eosData, telosData, /* bchData, */ ltcData, usdtData /* nimData */ ],
  tokenItems: [ ...Object.keys(tokensData).map(k => (tokensData[k])) ],
  errors: 'api.errors',
  checked: 'api.checked',
  peer,
}))

@cssModules(styles, { allowMultiple: true })
export default class SwapComponent extends PureComponent {

  state = {
    swap: null,
    ethBalance: null,
    currencyData: null,
    isAmountMore: null,
    SwapComponent: null,
    continueSwap: true,
    enoughBalance: true,
    depositWindow: false,
    paddingContainerValue: 0,

    timeSinceSecretPublished: 5,
    shouldStopCheckingWithdrawError: false,
  }

  timerFeeNotication = null


  componentWillMount() {
    const { items, tokenItems, intl: { locale } } = this.props
    let { match : { params : { orderId } }, history } = this.props

    if (!orderId) {
      history.push(localisedUrl(links.exchange))
      return
    }

    try {
      const swap = new Swap(orderId)
      const ethData = items.filter(item => item.currency === 'ETH')
      const currencyData = items.concat(tokenItems)
        .filter(item => item.currency === swap.sellCurrency.toUpperCase())[0]
      const currencies = [
        {
          currency: swap.sellCurrency,
          amount: swap.sellAmount,
        },
        {
          currency: swap.buyCurrency,
          amount: swap.buyAmount,
        },
      ]

      currencies.forEach(item => {
        actions.user.getExchangeRate(item.currency, 'usd')
          .then(exRate => {
            const amount = exRate * Number(item.amount)

            if (Number(amount) >= 50) {
              this.setState(() => ({ isAmountMore: 'enable' }))
            } else {
              this.setState(() => ({ isAmountMore: 'disable' }))
            }
          })
      })

      window.swap = swap

      this.setState({
        swap,
        ethData,
        currencyData,
        flow: swap.flow.state,
        isShowingBitcoinScript: false,
        ethAddress: ethData[0].address,
      })

    } catch (error) {
      console.error(error)
      actions.notifications.show(constants.notifications.ErrorNotification, { error: 'Sorry, but this order do not exsit already' })
      this.props.history.push(localisedUrl(links.exchange))
    }
    this.setSaveSwapId(orderId)
  }

  componentDidMount() {
    const { swap: { flow: { state: { canCreateEthTransaction, requireWithdrawFeeSended } } }, continueSwap } = this.state
    if (this.state.swap !== null) {

      let timer

      setTimeout(() => {
        if (!canCreateEthTransaction && continueSwap && requireWithdrawFeeSended) {
          this.checkEnoughFee()
        }
      }, 300 * 1000)

      timer = setInterval(() => {
        this.checkBalance()
        this.catchWithdrawError()
        this.requesting()
      }, 5000)
    }
    this.handleCheckPaddingValue()
    const { flow } = this.state
  }

  componentWillUnmount() {
    clearTimeout(this.timerFeeNotication)
  }

   requesting = () => {
     if (this.state.swap.flow.state.requireWithdrawFee && !this.state.swap.flow.state.requireWithdrawFeeSended) {
       this.state.swap.flow.sendWithdrawRequest()
     }
     if (this.state.swap.flow.state.withdrawRequestIncoming && !this.state.swap.flow.state.withdrawRequestAccepted) {
       this.state.swap.flow.acceptWithdrawRequest()
     }
   }

   timerShowFeeNotification = () => {
     const { timeSinceSecretPublished } = this.state
     const newTimeLeft = timeSinceSecretPublished - 1

     if (newTimeLeft > 0) {
       this.timerFeeNotication = setTimeout(this.timerShowFeeNotification, 60 * 1000)
       this.setState({
         timeSinceSecretPublished: newTimeLeft,
       })
     }
   }

   catchWithdrawError = () => {
     const { swap, timeSinceSecretPublished, shouldStopCheckingWithdrawError, continueSwap } = this.state

     if (swap.sellCurrency === 'BTC'
       && helpers.ethToken.isEthToken({ name: swap.sellCurrency.toLowerCase() })
       && !shouldStopCheckingWithdrawError
       && timeSinceSecretPublished !== 0) {
       this.setState(() => ({ continueSwap: true }))
     } else {
       this.checkEnoughFee()
       this.setState(() => ({
         shouldStopCheckingWithdrawError: true,
       }))
     }
   }

   checkEnoughFee = () => {
     const { swap: { participantSwap, flow: { state: { canCreateEthTransaction } } }, currencyData: { currency }, continueSwap, swap } = this.state

     const ethPair = ['BTC', 'ETH', 'LTC']

     if (canCreateEthTransaction === false && (
       helpers.ethToken.isEthToken({ name: swap.sellCurrency.toLowerCase() })
       || ethPair.includes(currency)
     )) {
       this.setState(() => ({
         continueSwap: false,
       }))
     } else {
       this.setState(() => ({
         continueSwap: true,
       }))
     }
   }

  handleFinishWithdraw = () => {
    this.state.swap.flow.acceptWithdrawRequest()
  }

  onRequeryWithdraw = () => {
    this.state.swap.flow.sendWithdrawRequest()
  }

  setSaveSwapId = (orderId) => {
    let swapsId = JSON.parse(localStorage.getItem('swapId'))

    if (swapsId === null || swapsId.length === 0) {
      swapsId = []
    }
    if (!swapsId.includes(orderId)) {
      swapsId.push(orderId)
    }
    localStorage.setItem('swapId', JSON.stringify(swapsId))
  }

  checkBalance = async () => {
    const { swap, currencyData } = this.state

    const curBalance = await actions[swap.sellCurrency.toLowerCase()].getBalance()

    if (helpers.ethToken.isEthToken({ name: swap.sellCurrency.toLowerCase() })) {
      const tokenBalance = await actions.token.getBalance(swap.sellCurrency.toLowerCase())
    }

    const balance = this.props.tokenItems.map(item => item.currency).includes(swap.sellCurrency) ? tokenBalance : curBalance

    if (swap.sellAmount.toNumber() > balance) {
      this.setState(() => ({ enoughBalance: false }))
    } else {
      this.setState(() => ({ enoughBalance: true }))
    }
  }


  requesting = () => {
    if (this.state.swap.flow.state.requireWithdrawFee && !this.state.swap.flow.state.requireWithdrawFeeSended) {
      this.state.swap.flow.sendWithdrawRequest()
    }
    if (this.state.swap.flow.state.withdrawRequestIncoming && !this.state.swap.flow.state.withdrawRequestAccepted) {
      this.state.swap.flow.acceptWithdrawRequest()
    }
  }

  checkIsTokenIncludes = () => {
    this.props.tokenItems.map(item => item.name).includes(this.props.swap.participantSwap._swapName.toLowerCase())
  }

  catchWithdrawError = () => {
    const { swap, shouldStopCheckingWithdrawError, continueSwap } = this.state

    if (swap.sellCurrency === 'BTC'
      && helpers.ethToken.isEthToken({ name: swap.buyCurrency.toLowerCase() })
      && !shouldStopCheckingWithdrawError) {
      this.setState(() => ({ continueSwap: true }))
    } else {
      this.checkEnoughFee()
      this.setState(() => ({
        shouldStopCheckingWithdrawError: true,
      }))
    }
  }

  checkEnoughFee = () => {
    const { swap: { participantSwap, flow: { state: { canCreateEthTransaction } } }, currencyData: { currency }, continueSwap } = this.state

    const currenciesInNeedETHFee = ['BTC', 'ETH', 'LTC']

    if (canCreateEthTransaction === false && (
      helpers.ethToken.isEthToken({ name: currency.toLowerCase() })
      || currenciesInNeedETHFee.includes(currency)
    )) {
      this.setState(() => ({
        continueSwap: false,
      }))
    }
  }


  handleCheckPaddingValue = () => {
    const { flow } = this.state

    if (flow.step <= 2) {
      this.setState(() => ({
        paddingContainerValue: 60 * flow.step,
      }))
    }
    if (flow.step === 3) {
      this.setState(() => ({
        paddingContainerValue: 120,
      }))
    }
    if (flow.step > 3 && flow.step < 7) {
      this.setState(() => ({
        paddingContainerValue: 60 * (flow.step - 2),
      }))
    }
    if (flow.step >= 7) {
      this.setState(() => ({
        paddingContainerValue: 300,
      }))
    }
  }

  toggleBitcoinScript = () => {
    this.setState({
      isShowingBitcoinScript: !this.state.isShowingBitcoinScript,
    })
  }

  handleGoHome = () => {
    const { intl: { locale } } = this.props
    this.props.history.push(localisedUrl(locale, links.home))
  }

  render() {
    const { peer, history, tokenItems } = this.props

    const {
      swap,
      flow,
      ethAddress,
      isAmountMore,
      currencyData,
      continueSwap,
      enoughBalance,
      paddingContainerValue,
      isShowingBitcoinScript,
      swap: { sellAmount, sellCurrency, buyCurrency, buyAmount, id, flow: { state: { step } }  },
    } = this.state

    if (!this.state.swap || !peer || !isAmountMore) {
      return null
    }
    const isFinished = (this.state.swap.flow.state.step >= (this.state.swap.flow.steps.length - 1))


    return (
      <div styleName="swap">
        <div className={this.props.styles.swapContainer} style={{ paddingTop: isMobile ? `${paddingContainerValue}px` : '' }}>
          {!enoughBalance && step === 4
            ? (
              <div className={this.props.styles.swapDepositWindow}>
                <DepositWindow currencyData={currencyData} swap={swap} flow={swap.flow.state} tokenItems={tokenItems} />
              </div>
            )
            : (
              <Fragment>
                {step >= 5 && !continueSwap
                  ? <FeeControler ethAddress={ethAddress} swap={swap} flow={this.state.swap.flow.state} />
                  : <SwapProgress data={swap.flow.state} name={`${sellCurrency}2${buyCurrency}`} step={step} swap={swap} history={history} tokenItems={tokenItems} />
                }
              </Fragment>
            )
          }
          <SwapList data={swap.flow.state} sellCurrency={sellCurrency} buyCurrency={buyCurrency} swap={swap} />

        </div>
        { flow.btcScriptValues &&
          <span onClick={this.toggleBitcoinScript}>
            <FormattedMessage id="EthToBtc204" defaultMessage="Show bitcoin script" />
          </span>
        }
        {isShowingBitcoinScript &&
          <BtcScript
            secretHash={flow.btcScriptValues.secretHash}
            recipientPublicKey={flow.btcScriptValues.recipientPublicKey}
            lockTime={flow.btcScriptValues.lockTime}
            ownerPublicKey={flow.btcScriptValues.ownerPublicKey}
          />}
        <Share flow={swap.flow} />
        <EmergencySave flow={swap.flow} />
        {peer === swap.owner.peer && (<DeleteSwapAfterEnd swap={swap} />)}
        <SwapController swap={swap} />
      </div>
    )
  }
}
