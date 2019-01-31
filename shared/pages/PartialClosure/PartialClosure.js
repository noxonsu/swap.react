import React, { Component, Fragment } from 'react'

import Link from 'sw-valuelink'
import { links } from 'helpers'

import CSSModules from 'react-css-modules'
import styles from './PartialClosure.scss'

import { connect } from 'redaction'
import actions from 'redux/actions'
import { BigNumber } from 'bignumber.js'
import { Redirect } from 'react-router-dom'

import SelectGroup from './SelectGroup/SelectGroup'
import Advantages from './PureComponents/Advantages'
import { Button, Toggle, Flip } from 'components/controls'
import Input from 'components/forms/Input/Input'
import FieldLabel from 'components/forms/FieldLabel/FieldLabel'
import Tooltip from 'components/ui/Tooltip/Tooltip'

import PageHeadline from 'components/PageHeadline/PageHeadline'
import InlineLoader from 'components/loaders/InlineLoader/InlineLoader'
import { FormattedMessage, injectIntl } from 'react-intl'
import { localisedUrl } from 'helpers/locale'

import config from 'app-config'
import { util } from 'swap.app'

import constants from 'helpers/constants'

const PAIR_CHECK_RESULT = {
  NO_PAIR: -1,
  EQUAL: 0,
  HAVE_PAIR: 1,
}

const filterIsPartial = (orders) => orders
  .filter(order => order.isPartial && !order.isProcessing)

const text = [
  <FormattedMessage id="partial223" defaultMessage="To change default wallet for buy currency. " />,
  <FormattedMessage id="partial224" defaultMessage="Leave empty for use Swap.Online wallet " />,
]

const subTitle = (
  <FormattedMessage id="partial437" defaultMessage="Atomic Swap Exchange" />
)

@injectIntl
@connect(({
  currencies,
  addSelectedItems,
  core: { orders },
  user: { ethData, btcData, /* bchData, */ tokensData, eosData, telosData, nimData, usdtData, ltcData },
}) => ({
  currencies: currencies.items,
  addSelectedItems: currencies.addSelectedItems,
  orders: filterIsPartial(orders),
  currenciesData: [ ethData, btcData, eosData, telosData, /* bchData, */ ltcData, usdtData /* nimData */ ],
  tokensData: [ ...Object.keys(tokensData).map(k => (tokensData[k])) ],
}))
@CSSModules(styles)
export default class PartialClosure extends Component {

  static defaultProps = {
    orders: [],
  }

  static getDerivedStateFromProps({ orders }, { haveCurrency, getCurrency }) {
    if (!Array.isArray(orders)) { return }

    const filteredOrders = orders.filter(order => !order.isMy
      && order.sellCurrency === getCurrency.toUpperCase()
      && order.buyCurrency === haveCurrency.toUpperCase())

    return {
      filteredOrders,
    }
  }

  constructor({ tokensData, currenciesData, match: { params: { buy, sell, locale } }, history, ...props }) {
    super()

    const isWidgetBuild = config && config.isWidget

    const sellToken = sell || (!isWidgetBuild) ? 'eth' : 'btc'
    const buyToken = buy || (!isWidgetBuild) ? 'btc' : config.erc20token
    const localization = locale ? `/${locale}` : ''

    if (!props.location.hash.includes('#widget')) {
      history.push(`${localization}/exchange/${sellToken}-to-${buyToken}`)
    }

    this.wallets = {}
    currenciesData.forEach(item => {
      this.wallets[item.currency] = item.address
    })
    tokensData.forEach(item => {
      this.wallets[item.currency] = item.address
    })

    this.state = {
      haveCurrency: sellToken,
      getCurrency: buyToken,
      haveAmount: 0,
      haveUsd: 0,
      getUsd: 0,
      getAmount: '',
      maxAmount: 0,
      maxBuyAmount: new BigNumber(0),
      peer: '',
      goodRate: 0,
      filteredOrders: [],
      isNonOffers: false,
      isFetching: false,
      isDeclinedOffer: false,
      customWalletUse: true,
      customWallet: this.wallets[buyToken.toUpperCase()],
    }
    let timer
    let usdRates

    if (config.isWidget) {
      this.state.getCurrency = config.erc20token
    }
  }

  componentDidMount() {
    const { haveCurrency } = this.state

    actions.pairs.selectPair(haveCurrency)

    this.usdRates = {}
    this.getUsdBalance()

    this.timer = setInterval(() => {
      this.setOrders()
    }, 2000)
  }

  componentWillUnmount() {
    clearInterval(this.timer)
  }

  shouldComponentUpdate(nextPros) {

    if (nextPros.orders && this.props.orders && nextPros.orders > 0) {
      if (nextPros.orders.length === this.props.orders.length) {
        return false
      }
    }
    return true
  }

  additionalPathing = (sell, buy) => {
    const localization = this.props.match.params.locale
      ? `/${this.props.match.params.locale}`
      : ''
    if (!this.props.location.hash.includes('#widget')) {
      this.props.history.push(`${localization}/exchange/${sell}-to-${buy}`)
    }
  }

  getUsdBalance = async () => {
    const { haveCurrency, getCurrency } = this.state

    try {
      const exHaveRate = (this.usdRates[haveCurrency] !== undefined) ?
        this.usdRates[haveCurrency] : await actions.user.getExchangeRate(haveCurrency, 'usd')
      const exGetRate = (this.usdRates[getCurrency] !== undefined) ?
        this.usdRates[getCurrency] : await actions.user.getExchangeRate(getCurrency, 'usd')

      console.log('exHaveRate', exHaveRate)
      console.log('exGetRate', exGetRate)

      this.usdRates[haveCurrency] = exHaveRate
      this.usdRates[getCurrency] = exGetRate

      this.setState(() => ({
        exHaveRate,
        exGetRate,
      }))
    } catch (e) {
      console.log('Cryptonator offline')
    }
  }

  sendRequest = () => {
    const {
      getAmount, haveAmount, haveCurrency, getCurrency,
      peer, orderId, customWalletUse, customWallet,
    } = this.state

    console.log('sendRequest', getAmount, peer, orderId, haveAmount)

    if (!String(getAmount) || !peer || !orderId || !String(haveAmount)) {
      return
    }

    const newValues = {
      sellAmount: getAmount,
    }

    const destination = {
      address: this.customWalletAllowed() ? customWallet : null,
    }

    console.log('sendRequest for partial order', newValues, destination)

    this.setState(() => ({ isFetching: true }))

    actions.core.sendRequestForPartial(orderId, newValues, destination, (newOrder, isAccepted) => {
      console.log('sendRequest order received', newOrder, isAccepted)
      if (isAccepted) {
        this.setState(() => ({
          redirect: true,
          isFetching: false,
          orderId: newOrder.id,
        }))
      } else {
        this.setDeclinedOffer()
      }
    })
  }

  setDeclinedOffer = () => {
    this.setState(() => ({ haveAmount: '', isFetching: false, isDeclinedOffer: true }))

    setTimeout(() => {
      this.setState(() => ({
        isDeclinedOffer: false,
      }))
    }, 5000)
  }

  setNoOfferState = () => {
    this.setState(() => ({ isNonOffers: true }))
  }

  setAmountOnState = (maxAmount, getAmount, buyAmount) => {

    console.log('setAmountOnState')
    console.log('maxAmount', Number(maxAmount))
    console.log('getAmount', this.getFixed(getAmount))
    console.log('buyAmount', this.getFixed(buyAmount))

    this.setState(() => ({
      maxAmount: Number(maxAmount),
      getAmount: this.getFixed(getAmount),
      maxBuyAmount: buyAmount,
    }))

    return getAmount.isLessThanOrEqualTo(maxAmount)
  }

  getFixed = (value) => Number(value).toFixed(5)

  setAmount = (value) => {
    this.setState(() => ({ haveAmount: value, maxAmount: 0 }))
  }

  setOrders = async () => {
    const { filteredOrders, haveAmount, exHaveRate, exGetRate } = this.state

    if (filteredOrders.length === 0) {
      this.setNoOfferState()
      return
    }

    this.setState(() => ({
      isSearching: true,
    }))

    console.log('filteredOrders', filteredOrders.length)

    const sortedOrders = filteredOrders
      .sort((a, b) => Number(b.buyAmount.dividedBy(b.sellAmount)) - Number(a.buyAmount.dividedBy(a.sellAmount)))
      .map((item, index) => {

        const exRate = item.buyAmount.dividedBy(item.sellAmount)
        const getAmount = new BigNumber(String(haveAmount)).dividedBy(exRate)

        return {
          sellAmount: item.sellAmount,
          buyAmount: item.buyAmount,
          exRate,
          getAmount,
          orderId: item.id,
          peer: item.owner.peer,
        }
      })

    console.log('sortedOrder', sortedOrders.length)

    this.getUsdBalance()

    const didFound = await this.setOrderOnState(sortedOrders)

    console.log('didFound', didFound)

    if (didFound) {
      this.setState(() => ({
        isSearching: false,
      }))
    }
  }

  setOrderOnState = (orders) => {
    const { exHaveRate, exGetRate } = this.state
    const haveAmount = new BigNumber(this.state.haveAmount)

    let maxAllowedSellAmount = new BigNumber(0)
    let maxAllowedGetAmount = new BigNumber(0)
    let maxAllowedBuyAmount = new BigNumber(0)

    let isFounded = false
    let newState = {}

    orders.forEach(item => {
      maxAllowedSellAmount = (maxAllowedSellAmount.isLessThanOrEqualTo(item.sellAmount)) ? item.sellAmount : maxAllowedSellAmount
      maxAllowedBuyAmount = (maxAllowedBuyAmount.isLessThanOrEqualTo(item.buyAmount)) ? item.buyAmount : maxAllowedBuyAmount
      if (haveAmount.isLessThanOrEqualTo(item.buyAmount)) {
        maxAllowedGetAmount = (maxAllowedGetAmount.isLessThanOrEqualTo(item.getAmount)) ? item.getAmount : maxAllowedGetAmount
        const haveUsd = new BigNumber(String(exHaveRate)).multipliedBy(new BigNumber(haveAmount))
        const getUsd  = new BigNumber(String(exGetRate)).multipliedBy(new BigNumber(item.getAmount))

        isFounded = true
        newState = {
          haveUsd: Number(haveUsd).toFixed(2),
          getUsd: Number(getUsd).toFixed(2),
          isNonOffers: false,
          peer: item.peer,
          goodRate: item.exRate,
          orderId: item.orderId,
        }
      }
    })

    if (isFounded) {
      this.setState(() => (newState))
    } else {
      this.setState(() => ({
        isNonOffers: true,
        getUsd: Number(0).toFixed(2),
      }))
    }

    const checkAmount = this.setAmountOnState(maxAllowedSellAmount, maxAllowedGetAmount, maxAllowedBuyAmount)

    if (!checkAmount) {
      this.setNoOfferState()
    }
    return true
  }

  handleCustomWalletUse = () => {
    const newCustomWalletUse = !this.state.customWalletUse

    this.setState({
      customWalletUse: newCustomWalletUse,
      customWallet: (newCustomWalletUse === false) ? '' : this.getSystemWallet(),
    })
  }

  handleSetGetValue = ({ value }) => {
    const newState = {
      getCurrency: value,
      haveCurrency: this.state.haveCurrency,
      customWallet: this.state.customWalletUse ? this.wallets[value.toUpperCase()] : '',
    }

    const check = this.checkPair(value, this.state.haveCurrency)

    if (check === PAIR_CHECK_RESULT.NO_PAIR) {
      const selected = actions.pairs.selectPair(value)
      newState.haveCurrency = selected[0].value
    } else if (check === PAIR_CHECK_RESULT.EQUAL) {
      newState.haveCurrency = this.state.getCurrency
    }

    this.setState(() => (newState))
    this.additionalPathing(newState.haveCurrency, value)
  }

  handleSetHaveValue = ({ value }) => {
    const newState = {
      getCurrency: this.state.getCurrency,
      haveCurrency: value,
    }
    const check = this.checkPair(value, this.state.getCurrency)

    if (check === PAIR_CHECK_RESULT.NO_PAIR) {
      const selected = actions.pairs.selectPair(value)
      newState.getCurrency = selected[0].value
    } else if (check === PAIR_CHECK_RESULT.EQUAL) {
      newState.getCurrency = this.state.haveCurrency
    }

    this.setState(() => (newState))
    this.additionalPathing(value, newState.getCurrency)
  }

  handleFlipCurrency = () => {
    this.setClearState()
    const newState = {
      haveCurrency: this.state.getCurrency,
      getCurrency: this.state.haveCurrency,
      customWallet: this.state.customWalletUse ? this.wallets[this.state.haveCurrency.toUpperCase()] : '',
    }
    const check = this.checkPair(this.state.haveCurrency, this.state.getCurrency)

    if (check === PAIR_CHECK_RESULT.EQUAL) {
      const selected = actions.pairs.selectPair(this.state.haveCurrency)
      newState.getCurrency = selected[0].value
    }

    this.setState(() => (newState))
    this.additionalPathing(newState.haveCurrency, newState.getCurrency)
  }

  handlePush = (isWidget = false) => {
    const { intl: { locale } } = this.props
    const { haveCurrency, getCurrency } = this.state
    const localization = this.props.match.params.locale
      ? `/${this.props.match.params.locale}`
      : ''
    const tradeTicker = `${haveCurrency}-${getCurrency}`
    const hostname = window.location.origin
    const pathname = constants.tradeTicker.includes(tradeTicker.toUpperCase())
      ? tradeTicker
      : tradeTicker.split('-').reverse().join('-')

    if (isWidget) {
      window.parent.location.replace(`${hostname}/${pathname}`)
    } else {
      this.props.history.push(`${localization}/${tradeTicker}`)
    }
  }

  setClearState = () => {
    this.setState(() => ({
      haveAmount: 0,
      haveUsd: 0,
      getUsd: 0,
      getAmount: '',
      maxAmount: 0,
      maxBuyAmount: new BigNumber(0),
      peer: '',
      isNonOffers: false,
      isFetching: false,
      isDeclinedOffer: false,
      customWallet: this.state.customWalletUse ? this.wallets[this.state.getCurrency.toUpperCase()] : '',
    }))
  }

  getSystemWallet = () => {
    const { getCurrency } = this.state

    return this.wallets[getCurrency.toUpperCase()]
  }

  customWalletValid() {
    const { haveCurrency, getCurrency, customWallet } = this.state

    if (!this.customWalletAllowed()) {
      return true
    }

    if (getCurrency === 'btc') return util.typeforce.isCoinAddress.BTC(customWallet)

    return util.typeforce.isCoinAddress.ETH(customWallet)
  }

  customWalletAllowed() {
    const { haveCurrency, getCurrency } = this.state

    if (haveCurrency === 'btc') {
      // btc-token
      if (config.erc20[getCurrency] !== undefined) return true
      // btc-eth
      if (getCurrency === 'eth') return true
    }
    if (config.erc20[haveCurrency] !== undefined) {
      // token-btc
      if (getCurrency === 'btc') return true
    }

    if (haveCurrency === 'eth') {
      // eth-btc
      if (getCurrency === 'btc') return true
    }
    return false
  }

  checkPair = (value, staticVal) => {
    const selected = actions.pairs.selectPair(value)

    if (value === staticVal) {
      return PAIR_CHECK_RESULT.EQUAL
    }

    const check = selected.map(item => item.value).includes(staticVal)

    if (!check) {
      return PAIR_CHECK_RESULT.NO_PAIR
    }
    return PAIR_CHECK_RESULT.HAVE_PAIR
  }


  render() {
    const { currencies, addSelectedItems, currenciesData, intl: { locale } } = this.props
    const { haveCurrency, getCurrency, isNonOffers, redirect, orderId, isSearching,
      isDeclinedOffer, isFetching, maxAmount, customWalletUse, customWallet, getUsd, haveUsd,
      maxBuyAmount, getAmount, goodRate,
    } = this.state

    const oneCryptoCost = maxBuyAmount.isLessThanOrEqualTo(0) ? BigNumber(0) : BigNumber(goodRate)
    const linked = Link.all(this, 'haveAmount', 'getAmount', 'customWallet')

    const isWidgetExtention = config && config.isWidget
    const isWidgetLink = this.props.location.pathname.includes('/exchange/') && this.props.location.hash === '#widget'
    const isWidget = isWidgetExtention || isWidgetLink

    if (redirect) {
      return <Redirect push to={`${localisedUrl(locale, links.swap)}/${getCurrency}-${haveCurrency}/${orderId}`} />
    }

    let canDoOrder = !isNonOffers
    if (!(Number(getAmount) > 0)) canDoOrder = false
    if (this.customWalletAllowed() && !this.customWalletValid()) canDoOrder = false

    return (
      <Fragment>
        {
          (!isWidget) && (
            <div styleName="TitleHolder">
              <PageHeadline subTitle={subTitle} />
            </div>
          )
        }
        <div styleName={isWidget ? 'widgetSection' : 'section'} className={isWidget ? 'section' : ''} >
          {
            (!isWidget) && (
              <Advantages />
            )
          }
          <div styleName="block" className={isWidget ? 'block' : ''} >
            <SelectGroup
              inputValueLink={linked.haveAmount.pipe(this.setAmount)}
              selectedValue={haveCurrency}
              onSelect={this.handleSetHaveValue}
              label={<FormattedMessage id="partial243" defaultMessage="You sell" />}
              id="partialClosure456"
              tooltip={<FormattedMessage id="partial462" defaultMessage="The amount you have in your swap.online wallet or external wallet that you want to exchange" />}
              placeholder="Enter amount"
              usd={(maxAmount > 0 && isNonOffers) ? 0 : haveUsd}
              currencies={currencies}
              className={isWidget ? 'SelGroup' : ''}
            />
            <p className={isWidget ? 'advice' : ''} >
              <FormattedMessage id="partial221" defaultMessage="Max amount for exchange: " />
              {Math.floor(maxBuyAmount.toNumber() * 1000) / 1000}{' '}{haveCurrency.toUpperCase()}
            </p>
            {
              this.state.haveCurrency !== this.state.getCurrency && (
                <Flip onClick={this.handleFlipCurrency} styleName="flipButton" className={isWidget ? 'flipBtn' : ''} />
              )
            }
            <SelectGroup
              inputValueLink={linked.getAmount}
              selectedValue={getCurrency}
              onSelect={this.handleSetGetValue}
              label={<FormattedMessage id="partial255" defaultMessage="You get" />}
              id="partialClosure472"
              tooltip={<FormattedMessage id="partial478" defaultMessage="The amount you receive after the exchange" />}
              disabled
              currencies={addSelectedItems}
              usd={getUsd}
              className={isWidget ? 'SelGroup' : ''}
            />
            {
              (isSearching || (isNonOffers && maxAmount === 0)) && (
                <span className={isWidget ? 'searching' : ''}>
                  <FormattedMessage id="PartialPriceSearch" defaultMessage="Searching orders..." />
                  <div styleName="loaderHolder">
                    <div styleName="additionalLoaderHolder">
                      <InlineLoader />
                    </div>
                  </div>
                </span>
              )
            }
            { oneCryptoCost.isGreaterThan(0) && oneCryptoCost.isFinite() && !isNonOffers && (
              <div className={isWidget ? 'priceSearch' : ''}>
                <FormattedMessage
                  id="PartialPriceSearch502"
                  defaultMessage="Price: 1 {getCurrency} = {haveCurrency}"
                  values={{ getCurrency: `${getCurrency.toUpperCase()}`, haveCurrency: `${oneCryptoCost.toFixed(5)} ${haveCurrency.toUpperCase()}` }}
                />
              </div>
            )}
            { !oneCryptoCost.isFinite() && !isNonOffers && (
              <FormattedMessage id="PartialPriceCalc" defaultMessage="Calc price" />
            )}
            {maxAmount > 0 && isNonOffers && (
              <Fragment>
                <p styleName="error" className={isWidget ? 'error' : ''} >
                  <FormattedMessage id="PartialPriceNoOrdersReduce" defaultMessage="No orders found, try to reduce the amount" />
                </p>
                <p styleName="error" className={isWidget ? 'error' : ''} >
                  <FormattedMessage id="PartialPriceReduceMin" defaultMessage="Maximum available amount: " />
                  {maxAmount}{' '}{getCurrency.toUpperCase()}
                </p>
              </Fragment>
            )}
            {isDeclinedOffer && (
              <p styleName="error" className={isWidget ? 'error' : ''} >
                {`Offer is declined`}
              </p>
            )}
            {
              isFetching && (
                <span className={isWidget ? 'wait' : ''}>
                  <FormattedMessage id="partial291" defaultMessage="Wait participant: " />
                  <div styleName="loaderHolder">
                    <td styleName="additionalLoaderHolder">
                      <InlineLoader />
                    </td>
                  </div>
                </span>
              )
            }

            {
              this.customWalletAllowed() && (
                <Fragment>
                  <FieldLabel>
                    <strong>
                      <FormattedMessage id="PartialYourWalletAddress" defaultMessage="Receiving wallet address" />
                    </strong>
                    &nbsp;
                    <Tooltip id="PartialClosure">
                      <FormattedMessage id="PartialClosure" defaultMessage="The wallet address to where cryptocurrency will be sent after the exchange" />
                    </Tooltip >
                  </FieldLabel>
                  <div styleName="walletInput">
                    <Input required disabled={customWalletUse} valueLink={linked.customWallet} pattern="0-9a-zA-Z" placeholder="Enter the destination address" />
                  </div>
                  <div styleName="walletToggle">
                    <Toggle checked={customWalletUse} onChange={this.handleCustomWalletUse} />
                    <FormattedMessage id="PartialUseSwapOnlineWallet" defaultMessage="Use Swap.Online wallet" />
                  </div>
                </Fragment>
              )
            }
            <div styleName="rowBtn" className={isWidget ? 'rowBtn' : ''}>
              <Button styleName="button" brand onClick={this.sendRequest} disabled={!canDoOrder}>
                <FormattedMessage id="partial541" defaultMessage="Exchange now" />
              </Button>
              <Button styleName="button" gray onClick={() => this.handlePush(isWidgetLink)} >
                <FormattedMessage id="partial544" defaultMessage="Show order book" />
              </Button>
            </div>
          </div>
        </div>
        {
          (!isWidget) && (
            <p styleName="inform">
              <FormattedMessage
                id="PartialClosure562"
                defaultMessage="Swap.Online is the decentralized in-browser hot wallet based on the Atomic Swaps technology.
                  As in our wallet all blockchains interact decentralized and no-third-party way, we offer our users to exchange Bitcoin, Ethereum,
                  USD Tether, BCH and EOS for free in a couple of seconds. At the time, Swap.Online charges no commision for the order making and taking.
                  The exchange of crypto and tokens on Swap.Online is conducted in truly
                  decentralized manner as we use the Atomic Swaps technology of peer-to-peer cross-chain interaction.
                  Swap.Online uses IPFS-network for all the operational processes which results in no need for centralized server.
                  The interface of exchange seems to look like that of crypto broker, not of ordinary DEX or CEX. In a couple of clicks,
                  the user can place and take the offer, customizing the price of sent token.
                  Also, the user can exchange the given percentage of his or her amount of tokens available (e.g. ½, ¼ etc.).
                  One more advantage of the Swap.Online exchange service is the usage of one key for the full range of ERC-20 tokens.
                  By the way, if case you’re not interested in exchange of some tokens, you can hide it from the list.
                  Thus, use Swap.Online as your basic exchange for every crypto you’re holding!"
              />
            </p>
          )
        }
      </Fragment>
    )
  }
}
