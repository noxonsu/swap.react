import React, { Component, Fragment } from 'react'

import actions from 'redux/actions'
import { constants } from 'helpers'
import { isMobile } from 'react-device-detect'

import crypto from 'crypto'
import config from 'app-config'
import { BigNumber } from 'bignumber.js'
import Swap from 'swap.swap'

import CopyToClipboard from 'react-copy-to-clipboard'
import InlineLoader from 'components/loaders/InlineLoader/InlineLoader'
import TimerButton from 'components/controls/TimerButton/TimerButton'
import Link from 'sw-valuelink'
import Input from 'components/forms/Input/Input'
import Button from 'components/controls/Button/Button'
import DepositWindow from './DepositWindow/DepositWindow'
import SwapProgress from './SwapProgress/SwapProgress'
import SwapList from './SwapList/SwapList'
import QR from 'components/QR/QR'
import SwapApp from 'swap.app'
import Timer from './Timer/Timer'
import { FormattedMessage } from 'react-intl'
import BtcScript from './BtcScript/BtcScript'
import FeeControler from './FeeControler/FeeControler'


export default class BtcToEthToken extends Component {

  // static getDerivedStateFromProps({ enoughBalance }) {
  //   return {
  //     enoughBalance,
  //   }
  // }

  constructor({ swap, currencyData, ethData, enoughBalance, styles, depositWindow }) {

    super()

    this.swap = swap

    this.state = {
      swap,
      depositWindow,
      enoughBalance,
      isPressCtrl: false,
      isTextCopied: false,
      enabledButton: false,
      isAddressCopied: false,
      flow: this.swap.flow.state,
      paddingContainerValue: 0,
      destinationAddressTimer: true,
      isShowingBitcoinScript: false,
      currencyAddress: currencyData.address,
      ethAddress: ethData.map(item => item.address),
      secret: crypto.randomBytes(32).toString('hex'),
      destinationBuyAddress: (this.swap.destinationBuyAddress) ? this.swap.destinationBuyAddress : SwapApp.shared().services.auth.accounts.eth.address,
    }

    this.confirmAddressTimer = null
    this.ParticipantTimer = null

  }

  componentWillMount() {
    this.swap.on('state update', this.handleFlowStateUpdate)
  }

  componentWillUnmount() {
    this.swap.off('state update', this.handleFlowStateUpdate)
  }

  componentDidMount() {
    const { swap, flow: { step, isParticipantSigned } } = this.state
    this.changePaddingValue()
    this.confirmAddressTimer = setInterval(() => {
      if (this.state.flow.step === 1) {
        this.confirmAddress()
      } else {
        clearInterval(this.confirmAddressTimer)
      }
    }, 3000)

    this.ParticipantTimer = setInterval(() => {
      if (this.state.flow.isParticipantSigned && this.state.destinationBuyAddress) {
        this.submitSecret()
      }
      else {
        clearInterval(this.ParticipantTimer)
      }
    }, 3000)

  }

  changePaddingValue = () => {
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

  handleFlowStateUpdate = (values) => {

    const stepNumbers = {
      'sign': 1,
      'submit-secret': 2,
      'sync-balance': 3,
      'lock-btc': 4,
      'wait-lock-eth': 5,
      'withdraw-eth': 6,
      'finish': 7,
      'end': 8,
    }

    actions.analytics.swapEvent(stepNumbers[values.step], 'BTC2ETHTOKEN')

    this.setState({
      flow: values,
    })
  }

  submitSecret = () => {
    const { secret } = this.state
    this.swap.flow.submitSecret(secret)
  }

  confirmAddress = () => {
    this.swap.setDestinationBuyAddress(this.state.destinationBuyAddress)
    this.setState({ destinationAddressTimer : false })
  }
  toggleBitcoinScript = () => {
    this.setState({
      isShowingBitcoinScript: !this.state.isShowingBitcoinScript,
    })
  }

  handleCopyAddress = (e) => {
    this.setState({
      isAddressCopied: true,
    }, () => {
      setTimeout(() => {
        this.setState({
          isAddressCopied: false,
        })
      }, 500)
    })
  }

  handleCopyText = () => {
    this.setState({
      isTextCopied: true,
    }, () => {
      setTimeout(() => {
        this.setState({
          isTextCopied: false,
        })
      }, 15 * 1000)
    })
  }

  onCopyAddress = (e) => {
    e.preventDefault()
    this.setState({
      isPressCtrl: true,
    })
  }

  handlerBuyWithCreditCard = (e) => {
    e.preventDefault()
  }

  render() {
    const { children, disabledTimer, currencyData, continueSwap, enoughBalance, history, tokenItems } = this.props
    const {
      swap,
      flow,
      secret,
      ethAddress,
      paddingContainerValue,
      isShowingBitcoinScript,
    } = this.state

    const linked = Link.all(this, 'destinationBuyAddress')

    linked.destinationBuyAddress.check((value) => value !== '', 'Please enter ETH address for tokens')
    return (
      <div>
        <div className={this.props.styles.swapContainer} style={{ paddingTop: isMobile ? `${paddingContainerValue}px` : '' }}>
          <div className={this.props.styles.swapInfo}>
            {this.swap.id &&
              (
                <strong>
                  {this.swap.sellAmount.toFixed(6)}
                  {' '}
                  {this.swap.sellCurrency} &#10230; {' '}
                  {this.swap.buyAmount.toFixed(6)}
                  {' '}
                  {this.swap.buyCurrency}
                </strong>
              )
            }
          </div>
          {!this.props.enoughBalance && this.state.swap.flow.state.step === 4
            ? (
              <div className={this.props.styles.swapDepositWindow}>
                <DepositWindow currencyData={currencyData} swap={swap} flow={flow} tokenItems={tokenItems} />
              </div>
            )
            : (
              <Fragment>
                {flow.step >= 5 && !continueSwap
                  ? <FeeControler ethAddress={ethAddress} />
                  : <SwapProgress flow={flow} name="BtcToEthTokens" swap={this.props.swap} history={history} tokenItems={tokenItems} />
                }
              </Fragment>
            )
          }
          <SwapList flow={this.state.swap.flow.state} enoughBalance={enoughBalance} swap={this.props.swap} />
        </div>
        { flow.btcScriptValues &&
          <span onClick={this.toggleBitcoinScript}>
            <FormattedMessage id="swapJS341" defaultMessage="Show bitcoin script" />
          </span>
        }
        {isShowingBitcoinScript &&
          <BtcScript
            secretHash={flow.btcScriptValues.secretHash}
            recipientPublicKey={flow.btcScriptValues.recipientPublicKey}
            lockTime={flow.btcScriptValues.lockTime}
            ownerPublicKey={flow.btcScriptValues.ownerPublicKey}
          />}
        {children}
      </div>
    )
  }
}
