import React from 'react';
import { NetStatusEvent, netStatusService } from '../../services/netStatusService.js';
import {
  CryptoChart,
  enrichSeriesWithDefaultOptions,
  getChartOptionsToBeAddedWithData,
} from '../Chart/Chart.js';
import { NetStatusNotification } from '../NetStatusNotification/NetStatusNotification.js';
import { Deal } from '../Deal/Deal.js';
import { binanceService, BinanceServiceEvent } from '../../services/binance.service.js';

import logo from '../../logo.svg';
import './App.css';
import { Notification } from '../Notification/Notification.js';


const SymbolPair = {
  BTCUSDT: 'BTCUSDT',
};
const PAIR_DEFAULT = SymbolPair.BTCUSDT;
const pairTitleMap = {
  [SymbolPair.BTCUSDT]: 'BTC/USDT',
};

const NOTIFICATION_TEXT_DEFAULT = '';
const TEXT_API_UNAVAILABLE = 'Binance api is unavailable.';
const TEXT_STREAM_ERROR = 'Error in Binance data stream.';

class App extends React.Component {
  currentSymbolPair = PAIR_DEFAULT;
  state = {
    initialized: false,
    initialData: undefined,
    dealShow: false,
    notificationShow: false,
    notificationText: NOTIFICATION_TEXT_DEFAULT,
  };
  chartRef = React.createRef();

  constructor(props) {
    super(props);
    netStatusService.on(NetStatusEvent.ONLINE, this.handleOnlineStatus);
    netStatusService.on(NetStatusEvent.OFFLINE, this.handleOfflineStatus);
  }

  showDeal() {
    this.setState({ dealShow: true });
  }

  hideDeal() {
    this.setState({ dealShow: false });
  }

  showNotification() {
    this.setState({ notificationShow: true });
  }

  hideNotification() {
    this.setState({ notificationText: NOTIFICATION_TEXT_DEFAULT });
    this.setState({ notificationShow: false });
  }

  handleOnlineStatus = () => {
    const { initialized } = this.state;
    if (initialized) {
      this.showDeal();
    } else {
      this.init();
    }
  };

  handleOfflineStatus = () => {
    this.hideDeal();
  };

  componentDidMount() {
    this.init();
  }

  init() {
    this.initStreamHandlers();
    binanceService
      .getInitialData(this.currentSymbolPair)
      .then((data) => {
        // this.chartRef.current.chart.addSeries({ data: [1, 2, 1, 4, 3, 6, 7, 3, 8, 6, 9] });
        this.setState({ initialized: true });
        this.setState({
          initialData: data,
        });
        this.hideNotification();
        this.showDeal();
        this.connectToStream();
      })
      .catch(() => {
        this.setState({ initialized: false });
        this.setState({ notificationText: TEXT_API_UNAVAILABLE });
        this.showNotification();
        this.hideDeal();
      });
  }

  connectToStream() {
    binanceService.connectToStream(this.currentSymbolPair);
  }

  initStreamHandlers() {
    binanceService.on(BinanceServiceEvent.MESSAGE, this.handleStreamMessage);
    binanceService.on(BinanceServiceEvent.ERROR, this.handleStreamError);
  }

  handleStreamMessage = (dataPoint) => {
    this.hideStreamErrorIfNeeded();
    // console.log(data);
    const chart = this.chartRef.current.chart;
    const series = chart.series[0];
    if (series) {
      series.addPoint(dataPoint, true, false, true);
      // series.removePoint(0, true, true);
      chart.series[1].update();
      chart.series[2].update();
    } else {
      chart.update({
        series: [enrichSeriesWithDefaultOptions({data: [dataPoint]})],
        ...getChartOptionsToBeAddedWithData(),
      }, true, true, true);
    }
  };

  handleStreamError = () => {
    this.setState({ notificationText: TEXT_STREAM_ERROR });
    this.showNotification();
    this.hideDeal();
  };

  hideStreamErrorIfNeeded() {
    const {
      notificationShow,
      notificationText,
    } = this.state;
    if (notificationShow && notificationText === TEXT_STREAM_ERROR) {
      this.hideNotification();
      this.showDeal();
    }
  }

  handleBuy = () => {
    const chart = this.chartRef.current.chart;
    const series = chart.series[1];
    const SHIFT_HACK = 2000;
    series.addPoint({x: Date.now() - SHIFT_HACK}, true);
  };

  handleSale = () => {
    const chart = this.chartRef.current.chart;
    const series = chart.series[2];
    const SHIFT_HACK = 2000;
    series.addPoint({x: Date.now() - SHIFT_HACK}, true);
  };

  render() {
    const {
      dealShow,
      notificationShow,
      notificationText,
    } = this.state;
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <div className="App-title">Binance live chart</div>
          <a
            className="App-link"
            rel="noreferrer noopener"
            target="_blank"
            href="https://github.com/archangel-irk/binance-live-chart"
          >
            GitHub
          </a>
        </header>
        <div className="App-main-wrapper">
          <div className="App-sidebar-left" />
          <div className="App-main">
            <CryptoChart
              title={pairTitleMap[this.currentSymbolPair]}
              initialData={this.state.initialData}
              ref={this.chartRef}
            />
            {dealShow &&
              <Deal
                onBuy={this.handleBuy}
                onSale={this.handleSale}
              />
            }
          </div>
          <div className="App-sidebar-right" />
        </div>
        <footer className="App-footer">2019 Konstantin Melnikov</footer>
        <NetStatusNotification />
        {notificationShow &&
          <Notification text={notificationText} />
        }
      </div>
    );
  }
}

export default App;
