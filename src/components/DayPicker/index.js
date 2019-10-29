import React, { Component } from 'react';
import DayPicker from 'react-day-picker';
import moment from 'moment';
import Store from '../../store';
import onClickOutside from 'react-onclickoutside';
import AlertContainer from 'react-alert';
import {
  queryDatesForActiveMonth,
  getAndSetNextPrev,
  STANDARD_STRING_DATE_FORMAT,
} from '../../utils/datesHelper';
import 'react-day-picker/lib/style.css';
import './DayPicker.scss';

class MyDatePicker extends Component {
  static defaultProps = {
    showNextPrev: false,
    searchAvailableDays: true,
    alignment: 'lb',
    minDate: new Date(Store.current.minDate),
    maxDate: new Date(Store.current.maxDate),
    onExpandedChange: () => {},
  };
  constructor(props) {
    super(props);
    this.state = {
      availableDays: [],
      dateInput: this.props.selectedDay.format(STANDARD_STRING_DATE_FORMAT),
      initialSelectedDay: this.props.selectedDay,
      selectedDay: this.props.selectedDay,
      expanded: false,
    };
    this.setTextInputRef = element => {
      this.textInput = element;
    };
  }
  alertOptions = {
    offset: 14,
    position: 'top center',
    theme: 'dark',
    time: 2000,
    transition: 'scale',
  };

  static getDerivedStateFromProps(props, state) {
    if (
      props.selectedDay.format(STANDARD_STRING_DATE_FORMAT) !==
      state.initialSelectedDay.format(STANDARD_STRING_DATE_FORMAT)
    ) {
      return {
        dateInput: props.selectedDay.format(STANDARD_STRING_DATE_FORMAT),
        selectedDay: props.selectedDay,
        initialSelectedDay: props.selectedDay,
      };
    }
    return null;
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.expanded !== this.state.expanded) {
      this.props.onExpandedChange(this.state.expanded);
    }
  }
  showAlert = msg => {
    this.alertContainer.show(msg, {
      type: 'info',
    });
  };

  fetchAvailableDaysInMonth = date => {
    if (!this.props.searchAvailableDays) return;
    queryDatesForActiveMonth(date, this.props.datasource || null).then(dateArray => {
      this.setState({
        availableDays: dateArray,
      });
    });
  };

  handleDayClick = dateString => {
    const date = moment(dateString);
    this.props.onSelect(date);
    this.setState({
      selectedDay: date,
      expanded: false,
    });
    this.textInput.blur();
  };

  onMonthChange = day => {
    this.fetchAvailableDaysInMonth(day);
  };

  showDatePicker = e => {
    this.setState({
      expanded: true,
    });
  };

  handleYearMonthChange = selectedMonthYear => {
    this.setState(
      oldState => {
        let selectedDay = moment(selectedMonthYear);
        const dayInMonth = oldState.selectedDay.date();
        const daysInMonthDropdown = selectedDay.endOf('month').date();
        if (daysInMonthDropdown > dayInMonth) {
          selectedDay = selectedDay.date(dayInMonth);
        } else {
          selectedDay = selectedDay.date(daysInMonthDropdown);
        }

        return {
          selectedDay,
        };
      },
      () => {
        this.daypicker.showMonth(new Date(selectedMonthYear));
      },
    );
  };

  onNextOrPrev = direction => {
    getAndSetNextPrev(direction)
      .then(res => {
        this.handleDayClick(res);
      })
      .catch(err => {
        this.showAlert(err);
      });
  };

  onFocusHandler = e => {
    this.fetchAvailableDaysInMonth(e.target.value);
    this.setState({
      expanded: true,
    });
  };

  inputChange = e => {
    const date = moment(e.target.value, STANDARD_STRING_DATE_FORMAT, true); //true for strict parsing
    if (date.isValid()) {
      this.daypicker.showMonth(new Date(e.target.value));
      this.setState({ dateInput: e.target.value, selectedDay: date });
    } else {
      this.setState({ dateInput: e.target.value });
    }
  };

  handleKeyPress = e => {
    if (e.key === 'Enter') {
      const date = moment(e.target.value, STANDARD_STRING_DATE_FORMAT, true); //true for strict parsing
      if (date.isValid()) {
        this.handleDayClick(e.target.value);
      }
    }
  };

  handleClickOutside = () => {
    this.setState({ expanded: false }, () => {
      if (
        this.state.initialSelectedDay.format(STANDARD_STRING_DATE_FORMAT) !==
        this.props.selectedDay.format(STANDARD_STRING_DATE_FORMAT)
      ) {
        this.props.onSelect(this.state.selectedDay);
      }
    });
  };

  renderDatePicker = () => {
    const modifiers = {
      available: this.state.availableDays.map(day => new Date(day)),
      selected: this.state.selectedDay.toDate(),
    };

    const isLeft = this.props.alignment.includes('l');
    let style;

    if (isLeft) {
      style = { left: 20 };
    } else {
      style = { left: -75 };
    }

    style.position = 'absolute';
    return (
      <div className="YearNavigation day-overlay" style={style}>
        <DayPicker
          ref={el => (this.daypicker = el)}
          showOutsideDays
          onMonthChange={month => this.onMonthChange(month)}
          modifiers={modifiers}
          month={this.state.selectedDay.toDate()} // initial month, for when expanding
          minFromDate={this.props.minDate}
          maxToDate={this.props.maxDate}
          onDayClick={this.handleDayClick}
          disabledDays={[{ after: new Date() }]}
          captionElement={({ minFromDate, date, localeUtils }) => (
            <YearMonthForm
              minFromDate={this.props.minDate}
              maxToDate={this.props.maxDate}
              date={date}
              localeUtils={localeUtils}
              onChange={this.handleYearMonthChange}
            />
          )}
          navbarElement={<Navbar />}
        />
        <div style={{ clear: 'both' }} />
      </div>
    );
  };

  render() {
    const { expanded, dateInput } = this.state;
    const { showNextPrev } = this.props;
    return (
      <div className="inlineDatepicker">
        <AlertContainer ref={a => (this.alertContainer = a)} {...this.alertOptions} />
        {showNextPrev && (
          <i
            className={'fa fa-caret-left cal-icon-left'}
            title={''}
            onClick={() => this.onNextOrPrev('prev')}
          />
        )}
        <i onClick={this.onFocusHandler} className={`fa fa-calendar cal-icon-cal`} />

        {showNextPrev && (
          <i
            className={'fa fa-caret-right cal-icon-right'}
            title={''}
            onClick={() => this.onNextOrPrev('next')}
          />
        )}
        <span>
          <div className="react-flex inline-flex">
            <input
              className="react-date-field__input"
              ref={this.setTextInputRef}
              value={dateInput}
              onChange={this.inputChange}
              onKeyPress={this.handleKeyPress}
              onClick={this.onFocusHandler}
              onBlur={this.handleInputBlur}
            />
          </div>
        </span>

        {expanded && this.renderDatePicker()}
      </div>
    );
  }
}

const YearMonthForm = ({ minFromDate, maxToDate, date, localeUtils, onChange }) => {
  const months = localeUtils.getMonths();

  const years = [];
  for (let i = minFromDate.getFullYear(); i <= maxToDate.getFullYear(); i += 1) {
    years.push(i);
  }

  const handleChange = function handleChange(e) {
    const { year, month } = e.target.form;
    onChange(new Date(year.value, month.value));
  };

  return (
    <form className="DayPicker-Caption">
      <select name="month" onChange={handleChange} value={date.getMonth()}>
        {months.map((month, i) => (
          <option key={month} value={i}>
            {month}
          </option>
        ))}
      </select>
      <select name="year" onChange={handleChange} value={date.getFullYear()}>
        {years.map(year => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </form>
  );
};

const Navbar = ({ nextMonth, previousMonth, onPreviousClick, onNextClick, className, localeUtils }) => {
  return (
    <div className={className}>
      <a
        style={{ float: 'left', position: 'relative' }}
        className="date-nav-button"
        onClick={() => onPreviousClick()}
      >
        <span style={{ display: 'inline-block' }}>
          <LeftArrowSvg />
        </span>
      </a>
      <a
        style={{ float: 'right', position: 'relative' }}
        className="date-nav-button"
        onClick={() => onNextClick()}
      >
        <span style={{ display: 'inline-block' }}>
          <RightArrowSvg />
        </span>
      </a>
    </div>
  );
};

const LeftArrowSvg = () => (
  <svg height="24" viewBox="0 0 24 24" width="24">
    <path stroke="white" fill="white" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
  </svg>
);

const RightArrowSvg = () => (
  <svg height="24" viewBox="0 0 24 24" width="24">
    <path stroke="white" fill="white" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
  </svg>
);

export default onClickOutside(MyDatePicker);
