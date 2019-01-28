import React, { Fragment } from 'react'
import PropTypes from 'prop-types'
import helpers, { constants } from 'helpers'
import actions from 'redux/actions'
import Link from 'sw-valuelink'
import { connect } from 'redaction'
import config from 'app-config'

import cssModules from 'react-css-modules'
import styles from './WithdrawModal.scss'

import { BigNumber } from 'bignumber.js'
import Modal from 'components/modal/Modal/Modal'
import FieldLabel from 'components/forms/FieldLabel/FieldLabel'
import Input from 'components/forms/Input/Input'
import Button from 'components/controls/Button/Button'
import Tooltip from 'components/ui/Tooltip/Tooltip'
import { FormattedMessage, injectIntl, defineMessages } from 'react-intl'
import ReactTooltip from 'react-tooltip'

import { isCoinAddress } from 'swap.app/util/typeforce'


const minAmount = {
  eth: 0.001,
  btc: 0.00015,
  ltc: 0.1,
  eos: 1,
  tlos: 1,
  noxon: 1,
  swap: 1,
  jot: 1,
  usdt: 0,
  erc: 1,
}

@injectIntl
@connect(
  ({
    currencies,
    user: { ethData, btcData, /* bchData, */ tokensData, eosData, telosData, nimData, usdtData, ltcData },
  }) => ({
    currencies: currencies.items,
    items: [ ethData, btcData, eosData, telosData, /* bchData, */ ltcData, usdtData /* nimData */ ],
    tokenItems: [ ...Object.keys(tokensData).map(k => (tokensData[k])) ],
  })
)
@cssModules(styles)
export default class WithdrawModal extends React.Component {

  static propTypes = {
    name: PropTypes.string,
    data: PropTypes.object,
  }

  constructor(data) {
    super()

    this.state = {
      isShipped: false,
      address: '',
      amount: '',
      minus: '',
      ethBalance: null,
      tokenFee: false,
      getUsd: 0,
    }
  }

  componentDidMount() {
    const { exCurrencyRate } = this.state
    const { data: { currency } } = this.props

    this.setBalanceOnState(currency)

    this.usdRates = {}
    this.getUsdBalance()
    this.actualyMinAmount()
  }

  componentWillUpdate(nextProps, nextState) {
    nextState.amount = this.fixDecimalCountETH(nextState.amount)
  }

  fixDecimalCountETH = (amount) => {
    if (this.props.data.currency === 'ETH' && BigNumber(amount).dp() > 18) {
      const amountInt = BigNumber(amount).integerValue()
      const amountDecimal = BigNumber(amount).mod(1)

      const amountIntStr = amountInt.toString()
      const amountDecimalStr = BigNumber(BigNumber(amountDecimal).toPrecision(15)).toString().substring(1)
      const regexr = /[e+-]/g

      const result = amountIntStr + amountDecimalStr

      console.warn("To avoid [ethjs-unit]error: while converting number with more then 18 decimals to wei - you can't afford yourself add more than 18 decimals") // eslint-disable-line
      if (regexr.test(result)) {
        console.warn('And ofcourse you can not write number which can not be saved without an exponential notation in JS')
        return 0
      }
      return result
    }
    return amount
  }

  actualyMinAmount = async () => {
    const { data: { currency } } = this.props

    const currentCoin = currency.toLowerCase()
    const coinsWithDynamicFee = [
      'eth',
      'ltc',
      'btc',
      'ethToken',
    ]

    if (helpers.ethToken.isEthToken({ name: currency.toLowerCase() })) {
      this.setState(() => ({
        tokenFee: true,
      }))
    }

    minAmount.erc = await helpers.ethToken.estimateFeeValue({ method: 'send', speed: 'normal' })

    if (coinsWithDynamicFee.includes(currentCoin)) {
      minAmount[currentCoin] = await helpers[currentCoin].estimateFeeValue({ method: 'send', speed: 'normal' })
    }
  }

  setBalanceOnState = async (currency) => {
    const { data: { unconfirmedBalance } } = this.props

    const balance = await actions[currency.toLowerCase()].getBalance(currency.toLowerCase())

    const finalBalance = unconfirmedBalance !== undefined && unconfirmedBalance < 0
      ? new BigNumber(balance).plus(unconfirmedBalance)
      : balance
    const ethBalance = await actions.eth.getBalance()

    this.setState(() => ({
      balance: finalBalance,
      ethBalance,
    }))
  }

  getUsdBalance = async () => {
    const { data: { currency } } = this.props

    const exCurrencyRate = await actions.user.getExchangeRate(currency, 'usd')

    this.usdRates[currency] = exCurrencyRate

    this.setState(() => ({
      exCurrencyRate,
    }))
  }

  handleSubmit = async () => {
    const { address: to, amount } = this.state
    const { data: { currency, address, balance }, name } = this.props

    this.setState(() => ({ isShipped: true }))

    this.setBalanceOnState(currency)

    let sendOptions = {
      to,
      amount,
      speed: 'normal',
    }

    if (helpers.ethToken.isEthToken({ name: currency.toLowerCase() })) {
      sendOptions = {
        ...sendOptions,
        name: currency.toLowerCase(),
      }
    } else {
      sendOptions = {
        ...sendOptions,
        from: address,
      }
    }

    await actions[currency.toLowerCase()].send(sendOptions)
      .then(() => {
        actions.loader.hide()
        actions[currency.toLowerCase()].getBalance(currency)
        this.setBalanceOnState(currency)

        actions.notifications.show(constants.notifications.SuccessWithdraw, {
          amount,
          currency,
          address: to,
        })

        this.setState(() => ({ isShipped: false }))
        actions.modals.close(name)
      })
  }

    sellAllBalance = async () => {
      const { amount, balance, currency, tokenFee } = this.state
      const { data } = this.props

      const minFee = tokenFee ? 0 : minAmount[data.currency.toLowerCase()]

      const balanceMiner = balance
        ? balance !== 0
          ? new BigNumber(balance).minus(minFee).toString()
          : balance
        : 'Wait please. Loading...'

      this.setState({
        amount: balanceMiner,
      })
    }

    isEthOrERC20() {
      const { name, data, tokenItems }  = this.props
      const { currency, ethBalance, tokenFee } = this.state
      return (
        (tokenFee === true && ethBalance < minAmount.erc) ? ethBalance < minAmount.erc : false
      )
    }

    addressIsCorrect() {
      const { data } = this.props
      const { address } = this.state

      return isCoinAddress[data.currency.toUpperCase()](address)
    }

    render() {
      const { address, amount, balance, isShipped, minus, ethBalance, tokenFee, exCurrencyRate } = this.state
      const { name, data, tokenItems, items } = this.props

      const linked = Link.all(this, 'address', 'amount')

      const min = tokenFee ? Math.floor(minAmount.erc * 1e6) / 1e6 : Math.floor(minAmount[data.currency.toLowerCase()] * 1e6) / 1e6
      const dataCurrency = tokenFee ? 'ETH' : data.currency.toUpperCase()

      const isDisabled =
        !address || !amount || isShipped || Number(amount) <= min
        || !this.addressIsCorrect()
        || (Number(amount) > balance)
        || this.isEthOrERC20()
      const NanReplacement = balance === undefined ? '...' : Number(balance).toFixed(5)
      const getUsd = amount * exCurrencyRate

      if (Number(amount) !== 0) {
        linked.amount.check((value) => Number(value) <= balance,
          <div style={{ width: '340px', fontSize: '12px' }}>
            <FormattedMessage
              id="Withdrow170"
              defaultMessage="The amount must be no more than your balance"
              values={{
                min: `${min.toFixed(6)}`,
                currency: `${data.currency}`,
              }}
            />
          </div>
        )
        linked.amount.check((value) => Number(value) > min,
          !tokenFee &&
          (
            <div style={{ width: '340px', fontSize: '12px' }}>
              <FormattedMessage id="Withdrow159" defaultMessage="Amount must be greater than  " />
              {min}
            </div>
          )
        )
      }

      if (this.state.amount < 0) {
        this.setState({
          amount: '',
          minus: true,
        })
      }

      const title = [
        <FormattedMessage id="Withdraw18333" defaultMessage={`Withdraw {data}`} values={{ data: `${data.currency.toUpperCase()}` }} />,
      ]

      return (
        <Modal name={name} title={title}>
          <p styleName={tokenFee ? 'rednotes' : 'notice'}>
            <FormattedMessage
              id="Withdrow213"
              defaultMessage="Please note: Miners fee is {minAmount} {data}.  {br}Represented balance is your balance minus the miners commission will appear. "
              values={{ minAmount: `${min}`, br: <br />, data: `${dataCurrency}` }} />
          </p>
          <FieldLabel inRow>
            <FormattedMessage id="Withdrow1194" defaultMessage="Address " />
            {' '}
            <Tooltip id="WtH203" >
              <div style={{ textAlign: 'center' }}>
                <FormattedMessage
                  id="WTH275"
                  defaultMessage="Make sure the wallet you {br}are sending the funds to supports {currency}"
                  values={{ br: <br />, currency: `${data.currency.toUpperCase()}` }}
                />
              </div>
            </Tooltip>
          </FieldLabel>
          <Input valueLink={linked.address} focusOnInit pattern="0-9a-zA-Z" placeholder={`Enter ${data.currency.toUpperCase()} address to transfer the funds`} />
          {address && !this.addressIsCorrect() && (
            <div styleName="rednote">
              <FormattedMessage
                id="WithdrawIncorectAddress"
                defaultMessage="Your address not correct" />
            </div>
          )}
          <p style={{ marginTop: '20px' }}>
            <FormattedMessage id="Withdrow113" defaultMessage="Your balance: " />
            {Number(balance).toFixed(5)}
            {' '}
            {data.currency.toUpperCase()}
          </p>
          <FieldLabel inRow>
            <FormattedMessage id="Withdrow118" defaultMessage="Amount " />
          </FieldLabel>
          <div styleName="group">
            <Input
              styleName="input"
              valueLink={linked.amount}
              pattern="0-9\."
              placeholder={`Enter the amount. You have ${NanReplacement}`}
              usd={getUsd.toFixed(2)}
            />
            <buttton styleName="button" onClick={this.sellAllBalance} data-tip data-for="Withdrow134">
              <FormattedMessage id="Select210" defaultMessage="MAX" />
            </buttton>
            <ReactTooltip id="Withdrow134" type="light" effect="solid">
              <FormattedMessage
                id="WithdrawButton32"
                defaultMessage="when you click this button, in the field, an amount equal to your balance minus the miners commission will appear" />
            </ReactTooltip>
          </div>
          {
            !linked.amount.error && !this.isEthOrERC20() && !tokenFee && (
              <div styleName={minus ? 'rednote' : 'note'}>
                <FormattedMessage id="WithdrawModal256" defaultMessage="No less than {minAmount}" values={{ minAmount: `${min}` }} />
              </div>
            )
          }
          {
            this.isEthOrERC20() && (
              <div styleName="rednote">
                <FormattedMessage id="WithdrawModal263" defaultMessage="You need {minAmount} ETH on your balance" values={{ minAmount: `${min}` }} />
              </div>
            )
          }
          <Button styleName="buttonFull" brand fullWidth disabled={isDisabled} onClick={this.handleSubmit}>
            <FormattedMessage id="WithdrawModal111" defaultMessage="Withdraw" />
            {' '}
            {data.currency.toUpperCase()}
          </Button>
        </Modal>
      )
    }
}
