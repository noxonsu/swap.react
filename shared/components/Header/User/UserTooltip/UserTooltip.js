import React, { Component } from 'react'
import PropTypes from 'prop-types'

import { connect } from 'redaction'

import { links } from 'helpers'
import { Link } from 'react-router-dom'

import styles from './UserTooltip.scss'
import CSSModules from 'react-css-modules'
import ArrowRightSvg from './images/arrow-right.svg'

import { TimerButton } from 'components/controls'
import { FormattedMessage } from 'react-intl'


@CSSModules(styles)
export default class UserTooltip extends Component {

  static propTypes = {
    feeds: PropTypes.array.isRequired,
    peer: PropTypes.string.isRequired,
    declineRequest: PropTypes.func.isRequired,
    acceptRequest: PropTypes.func.isRequired,
  }

  render() {
    const { feeds, peer: mePeer } = this.props

    return !!feeds.length && (
      <div styleName="column" >
        { feeds.length < 3  ? (
          feeds.map(row => {
            const { request, content: { buyAmount, buyCurrency, sellAmount, sellCurrency }, id, peer: ownerPeer } = row
            const reputationPlaceholder = '?'

            return (
              mePeer === ownerPeer &&
              request.map(({ participant: { peer }, reputation }) => (
                <div styleName="userTooltip" >
                  <div key={peer}>
                    <div styleName="title">
                      <FormattedMessage
                        id="userTooltip43"
                        defaultMessage="User ({reputation}) wants to swap"
                        values={{ reputation: <b>{Number.isInteger(reputation) ? reputation : reputationPlaceholder}</b> }}
                      />
                    </div>
                    <div styleName="currency">
                      <span>{buyAmount.toFixed(5)} <span styleName="coin">{buyCurrency}</span></span>
                      <span styleName="arrow"><img src={ArrowRightSvg} alt="" /></span>
                      <span>{sellAmount.toFixed(5)} <span styleName="coin">{sellCurrency}</span></span>
                    </div>
                  </div>
                  <span styleName="decline" onClick={() => this.props.declineRequest(id, peer)} />
                  <div styleName="checked" onClick={() => this.props.acceptRequest(id, peer, `${links.swap}/${sellCurrency}-${buyCurrency}/${id}`)} />
                  <TimerButton
                    timeLeft={0}
                    isButton={false}
                    onClick={() => this.props.acceptRequest(id, peer, `${links.swap}/${sellCurrency}-${buyCurrency}/${id}`)}
                  />
                </div>
              ))
            )
          })
        ) : (
          <div styleName="feed" >
            <Link to={links.feed} >
              <FormattedMessage id="QUESTION15" defaultMessage="Go to the feed page" />
            </Link>
          </div>
        )
        }
      </div>
    )
  }
}
