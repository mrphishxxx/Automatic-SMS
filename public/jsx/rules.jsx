var React = require('react');
var ReactDOM = require('react-dom');
var $ = require('jquery');
var moment = require('moment-timezone');
var _ = require('underscore');
var classNames = require('classnames');
var jstz = require('jstimezonedetect');

require('jquery-locationpicker');
require('timepicker');

var automaticEvents = {
  ignitionOn: 'Ignition on',
  ignitionOff: 'Ignition off'
};


function formatAddress(address) {
  return (address) ? address.replace(/\d{5}, USA$/, '') : 'Unknown Address';
}


function formatPhone(phone) {
  return (phone || '').replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
}


class Rule extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};

    this.showRuleEdit = () => {
      this.setState({editing: true});
      this.render();
    };

    this.hideRuleEdit = () => {
      this.setState({editing: false});
      this.render();
    };

    this.destroy = () => {
      if(confirm('Are you sure you want to delete this rule?')) {
        this.props.onRuleDestroy(this.props.rule);
      }
    };

    this.handleRuleCancel = () => {
      this.resetRule();
      this.hideRuleEdit();
    };

    this.handleRuleUpdate = (rule) => {
      rule._id = this.props.rule._id;
      this.props.onRuleUpdate(rule);
      this.hideRuleEdit();
    };

    this.handleRuleStatusChange = () =>{
      this.props.rule.enabled = this.refs.enabled.checked;
      this.handleRuleUpdate(this.props.rule);
    };
  }

  resetRule() {
    //TODO: reset the rule
  }

  getTimes() {
    var rule = this.props.rule;
    if(rule.allDay !== true) {
      return (
        <span>between <mark>{rule.startTime}</mark> and <mark>{rule.endTime}</mark></span>
      );
    } else {
      return (
        <mark>anytime</mark>
      );
    }
  }

  getTimeFilter() {
    var daysArray = [];
    var times = this.getTimes();
    var days;
    var rule = this.props.rule;
    if(rule.daySunday === true) {
      daysArray.push('Sun');
    }
    if(rule.dayMonday === true) {
      daysArray.push('Mon');
    }
    if(rule.dayTuesday === true) {
      daysArray.push('Tue');
    }
    if(rule.dayWednesday === true) {
      daysArray.push('Wed');
    }
    if(rule.dayThursday === true) {
      daysArray.push('Thu');
    }
    if(rule.dayFriday === true) {
      daysArray.push('Fri');
    }
    if(rule.daySaturday === true) {
      daysArray.push('Sat');
    }

    if(daysArray.length === 7 && rule.allDay === true) {
      days = (
        <mark>24 hours a day, 7 days a week</mark>
      );
      //No need for times
      times = '';
    } else if(daysArray.length === 7) {
      days = (
        <mark>every day</mark>
      );
    } else if(daysArray.length > 1) {
      var last = daysArray.pop();

      days = (
        <mark>{daysArray.join(', ')} and {last}</mark>
      );
    } else if(daysArray.length === 1) {
      days = (
        <mark>{daysArray[0]}</mark>
      );
    } else {
      days = (
        <mark>never</mark>
      );
    }

    return (
      <span>
        {days} {times}
      </span>
    )
  }

  getLocation() {
    var rule = this.props.rule;
    if(rule.anywhere === true) {
      return (
        <mark>anywhere</mark>
      );
    } else {
      return (
        <span>near <mark>{formatAddress(this.props.rule.address)}</mark></span>
      );
    }
  }

  getPhone() {
    var rule = this.props.rule;
    if(rule.phone) {
      return (
        <span>&nbsp;texts <mark>+{rule.countryCode} {rule.phone}</mark></span>
      );
    }
  }

  render() {
    var content;
    if(this.state.editing) {
      content = (
        <RuleForm structures={this.props.structures} onRuleSubmit={this.handleRuleUpdate} onRuleCancel={this.handleRuleCancel} rule={this.props.rule} ref="ruleForm" />
      );
    } else {
      var rule = this.props.rule;

      content = (
        <div>
          <div className="rule-controls">
            <a className="btn-edit glyphicon glyphicon-pencil" onClick={this.showRuleEdit}></a>
            <a className="btn-delete glyphicon glyphicon-trash" onClick={this.destroy}></a>
          </div>
          <div  className={classNames({
            disabled: rule.enabled === false,
            'rule-summary': true
          })}>
            <div className="rule-status">
              <label className="switch-light switch-candy" onClick={this.handleRuleStatusChange}>
                <input type="checkbox" ref="enabled" title="Enabled" defaultChecked={rule.enabled} key={rule._id} />
                <span>
                  <span>Off</span>
                  <span>On</span>
                  <a></a>
                </span>
              </label>
            </div>
            <h3 className="title">
              {rule.title}
            </h3>
            <div className="rule-summary-row">
              <mark>{automaticEvents[rule.automaticEvent]}</mark> {this.getLocation()} {this.getPhone()}
            </div>
            <div className="rule-summary-row">
              Applies {this.getTimeFilter()}
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="rule">
        {content}
      </div>
    );
  }
}

class RuleBox extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: []
    };

    this.handleRuleSubmit = (rule) => {
      rule.timezone = this.getTimezone();

      $.ajax({
        url: this.props.url,
        dataType: 'json',
        type: 'POST',
        data: rule,
        success: function(data) {
          var rules = this.state.data;
          rules.push(data);

          this.setState({data: rules});
        }.bind(this),
        error: function(xhr, status, err) {
          console.error(this.props.url, status, err.toString());
        }.bind(this)
      });
      this.hideRuleForm();
    };

    this.handleRuleUpdate = (rule) => {
      rule.timezone = this.getTimezone();

      // update rule optimistically
      var rules = this.state.data;

      rules.forEach(function(r, idx){
        if(r._id === rule._id) {
          rules[idx] = rule;
        }
      });

      this.setState({data: rules}, function() {
        $.ajax({
          url: this.props.url,
          dataType: 'json',
          type: 'PUT',
          data: rule,
          error: function(xhr, status, err) {
            console.error(this.props.url, status, err.toString());
          }.bind(this)
        });
      });
    };

    this.handleRuleDestroy = (rule) => {
      // delete rule optimistically
      var rules = this.state.data;
      this.setState({
        data: _.reject(rules, function(r) { return r._id === rule._id;})
      });

      $.ajax({
        url: this.props.url,
        dataType: 'json',
        type: 'DELETE',
        data: {_id: rule._id},
        success: function(data) {
        }.bind(this),
        error: function(xhr, status, err) {
          console.error(this.props.url, status, err.toString());
        }.bind(this)
      });
    };

    this.handleRuleCancel = () => {
      this.hideRuleForm();
    };

    this.showRuleForm = () => {
      this.setState({showRuleForm: true});
    };

    this.hideRuleForm = () => {
      this.setState({showRuleForm: false});
    };
  }

  getTimezone() {
    var timezone = jstz.determine();
    return timezone.name();
  }

  loadRulesFromServer() {
    $.ajax({
      url: this.props.url,
      dataType: 'json',
      success: function(data) {
        this.setState({data: data});
      }.bind(this),
      error: function(xhr, status, err) {
        console.error(this.props.url, status, err.toString());
      }.bind(this)
    });
  }

  loadCountsFromServer() {
    $.ajax({
      url: this.props.countURL,
      dataType: 'json',
      success: function(data) {
        this.setState({count: data.count || 0});
      }.bind(this),
      error: function(xhr, status, err) {
        console.error(this.props.countURL, status, err.toString());
      }.bind(this)
    });
  }

  componentDidMount() {
    this.loadRulesFromServer();
    this.loadCountsFromServer();
  }

  render() {
    if(this.state.error) {
      return (
        <div className="alert alert-danger">{errors[this.state.error] || this.state.error}</div>
      );
    } else {
      var ruleForm;

      if(this.state.showRuleForm) {
          ruleForm = (
            <div className="createRule">
              <h2>Create a new Rule</h2>
              <RuleForm onRuleSubmit={this.handleRuleSubmit} rule={this.props.rule} onRuleCancel={this.handleRuleCancel} structures={this.state.structures} isNew="true" />
            </div>
          );
      } else {
        ruleForm = (
          <a className="btn btn-blue btn-lg btn-create" onClick={this.showRuleForm}><i className="glyphicon glyphicon-plus"></i> Create a New Rule</a>
        );
      }

      return (
        <div>
          <div className="count">Messages sent this month: {this.state.count} of {smsMonthlyLimit}</div>
          <div className="rule-box">
            <RuleList data={this.state.data} onRuleDestroy={this.handleRuleDestroy} onRuleUpdate={this.handleRuleUpdate} />
            {ruleForm}
          </div>
        </div>
      );
    }
  }
}

class RuleList extends React.Component {
  constructor(props) {
    super(props);

    this.handleRuleDestroy = (rule) => {
      this.props.onRuleDestroy(rule);
    };

    this.handleRuleUpdate = (rule) => {
      this.props.onRuleUpdate(rule);
    };
  }

  render() {
    var ruleNodes = this.props.data.map((rule, index) => {
      return (
        <Rule rule={rule} structures={this.props.structures} key={index} onRuleDestroy={this.handleRuleDestroy} onRuleUpdate={this.handleRuleUpdate} />
      );
    });
    return (
      <div className="rule-list">
        {ruleNodes}
      </div>
    );
  }
}

class RuleForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      anywhere: this.props.rule.anywhere,
      automaticEvent: (this.props.rule.automaticEvent !== undefined) ? this.props.rule.automaticEvent : 'ignitionOn',
      errors: []
    };

    this.handleSubmit = (e) => {
      e.preventDefault();

      var rule = {
        enabled: (this.props.isNew === "true") ? true : this.props.rule.enabled,
        title: this.refs.title.value.trim(),
        daySunday: this.refs.daySunday.checked,
        dayMonday: this.refs.dayMonday.checked,
        dayTuesday: this.refs.dayTuesday.checked,
        dayWednesday: this.refs.dayWednesday.checked,
        dayThursday: this.refs.dayThursday.checked,
        dayFriday: this.refs.dayFriday.checked,
        daySaturday: this.refs.daySaturday.checked,
        startTime: this.refs.startTime.value.trim(),
        endTime: this.refs.endTime.value.trim(),
        allDay: this.refs.allDay.checked,
        automaticEvent: this.refs.automaticEvent.value,
        countryCode: this.refs.countryCode.value,
        phone: this.refs.phone.value.trim(),
        message: this.refs.message.value.trim(),
        includeMap: (this.refs.includeMap) ? this.refs.includeMap.checked : null,
        address: (this.refs.address) ? this.refs.address.value.trim() : null,
        latitude: (this.refs.address) ? this.props.rule.latitude : null,
        longitude: (this.refs.address) ? this.props.rule.longitude : null,
        radius: (this.refs.radius) ? this.refs.radius.value : null,
        anywhere: this.refs.anywhere.checked
      };

      if(!this.ruleFormIsValid(rule)) {
        return;
      }

      this.props.onRuleSubmit(rule);

      this.resetRuleFormErrors();
    };

    this.cancelEdit = () => {
      this.props.onRuleCancel();
    };

    this.handleAutomaticEventChange = () => {
      this.setState({automaticEvent: this.refs.automaticEvent.value});
    };

    this.handleAnywhereChange = () => {
      this.setState({anywhere: this.refs.anywhere.checked});
    };

    this.handleAllDayChange = () => {
      this.enableTimePicker();
    };
  }

  ruleFormIsValid(rule) {
    var isValid = true,
        errors = [];

    this.resetRuleFormErrors();

    if(!rule.title) {
      this.refs.title.parentNode.classList.add('has-error');
      isValid = false;
      errors.push('Title is required');
    }

    if(!rule.daySunday && !rule.dayMonday && !rule.dayTuesday && !rule.dayWednesday && !rule.dayThursday && !rule.dayFriday && !rule.daySaturday) {
      this.refs.daySunday.parentNode.parentNode.classList.add('has-error');
      isValid = false;
      errors.push('Select at least one day of the week');
    }

    if(rule.allDay !== true && moment(rule.startTime, 'h:mma') >= moment(rule.endTime, 'h:mma')) {
      this.refs.startTime.parentNode.classList.add('has-error');
      this.refs.endTime.parentNode.classList.add('has-error');
      isValid = false;
      errors.push('Start Time must be before End Time');
    }

    this.setState({errors: errors});

    return isValid;
  }

  resetRuleFormErrors() {
    $('.has-error', this).removeClass('has-error');
    this.setState({errors: []});
  }

  render() {
    if(this.state.anywhere !== true) {
      var locationForm = (
        <div>
          <div className="form-group">
            <label>Or within (distance)</label><br />
            <select ref="radius" className="form-control" defaultValue={this.props.rule.radius}>
              <option value="130">1 block</option>
              <option value="260">2 blocks</option>
              <option value="402">3 blocks</option>
              <option value="804">0.5 miles</option>
              <option value="1207">0.75 miles</option>
              <option value="1609">1 mile</option>
            </select>
          </div>
          <div className="form-group">
            <label>Of Address</label><br />
            <input type="text" ref="address" className="form-control address" defaultValue={this.props.rule.address} />
          </div>
          <div className="form-group">
            <div className="address-map" ref="addressMap"></div>
          </div>
        </div>
      );
    }

    if(this.state.automaticEvent === 'ignitionOn') {
      var includeMap = (
        <div className="form-group">
          <label className="checkbox-inline"><input type="checkbox" ref="includeMap" title="Include a Map" defaultChecked={(this.props.rule.includeMap !== undefined) ? this.props.rule.includeMap : true} /> Include a map of my current location (expires at the end of trip)</label>
        </div>
      );
    }

    if(this.state.errors.length) {
      var errorNodes = this.state.errors.map(function(error, index) {
        return (
          <li key={index}>{error}</li>
        );
      });
      var errors = (
        <div className="alert alert-danger">
          <ul>{errorNodes}</ul>
        </div>
      );
    }

    return (
      <form className="rule-form" onSubmit={this.handleSubmit} role="form">
        {errors}
        <div className="form-group form-title">
          <label>Title</label>
          <input type="text" placeholder="When I leave home, send an SMS to my significant other" ref="title" className="form-control" defaultValue={this.props.rule.title} />
        </div>
        <div className="form-section">
          <div className="form-section-header form-section-header-automatic"></div>
          <div className="form-group form-select">
            <label>Automatic Event</label>
            <select ref="automaticEvent" className="form-control" defaultValue={this.props.rule.automaticEvent} onChange={this.handleAutomaticEventChange}>
              <option value="ignitionOn">Ignition On</option>
              <option value="ignitionOff">Ignition Off</option>
            </select>
          </div>
          <div className="form-group">
            <label>Location</label><br />
            <label className="checkbox-inline"><input type="checkbox" ref="anywhere" title="Anywhere" defaultChecked={this.props.rule.anywhere} onChange={this.handleAnywhereChange} /> Anywhere</label>
          </div>
          {locationForm}
        </div>
        <div className="form-section">
          <div className="form-section-header form-section-header-time"><i className="glyphicon glyphicon-time"></i></div>
          <div className="form-group">
            <label>Day of Week</label>
            <div className="form-day-of-week">
              <label className="checkbox-inline"><input type="checkbox" ref="daySunday" title="Sunday" defaultChecked={(this.props.rule.daySunday !== undefined) ? this.props.rule.daySunday : true} /> S</label>
              <label className="checkbox-inline"><input type="checkbox" ref="dayMonday" title="Monday" defaultChecked={(this.props.rule.dayMonday !== undefined) ? this.props.rule.dayMonday : true} /> M</label>
              <label className="checkbox-inline"><input type="checkbox" ref="dayTuesday" title="Tueday" defaultChecked={(this.props.rule.dayTuesday !== undefined) ? this.props.rule.dayTuesday : true} /> T</label>
              <label className="checkbox-inline"><input type="checkbox" ref="dayWednesday" title="Wednesday" defaultChecked={(this.props.rule.dayWednesday !== undefined) ? this.props.rule.dayWednesday : true} /> W</label>
              <label className="checkbox-inline"><input type="checkbox" ref="dayThursday" title="Thursday" defaultChecked={(this.props.rule.dayThursday !== undefined) ? this.props.rule.dayThursday : true} /> T</label>
              <label className="checkbox-inline"><input type="checkbox" ref="dayFriday" title="Friday" defaultChecked={(this.props.rule.dayFriday !== undefined) ? this.props.rule.dayFriday : true} /> F</label>
              <label className="checkbox-inline"><input type="checkbox" ref="daySaturday" title="Saturday" defaultChecked={(this.props.rule.daySaturday !== undefined) ? this.props.rule.daySaturday : true} /> S</label>
            </div>
          </div>
          <div className="form-group">
            <label>Time</label><br />

            <div className="form-group">
              <label className="checkbox-inline"><input type="checkbox" ref="allDay" title="All Day" defaultChecked={this.props.rule.allDay}  onChange={this.handleAllDayChange} /> All Day</label>
            </div>

            <div className="form-inline form-time-of-day">
              <label>Or&hellip;</label><br />
              <div className="form-group">
                <input type="text" ref="startTime" className="form-control start-time" defaultValue={(this.props.rule.startTime !== undefined) ? this.props.rule.startTime : '5:00pm'} />
              </div>
              <span> to </span>
              <div className="form-group">
                <input type="text" ref="endTime" className="form-control end-time" defaultValue={(this.props.rule.endTime !== undefined) ? this.props.rule.endTime : '8:00pm'} />
              </div>
            </div>
          </div>
        </div>
        <div className="form-section">
          <div className="form-section-header form-section-header-sms"><i className="fa fa-mobile"></i></div>
          <div className="form-group form-inline">
            <label>Phone Number to Text:</label>
            <select ref="countryCode" className="form-control rule-country-code" defaultValue={this.props.rule.countryCode}>
              <option value="1">USA/Canada (+1)</option>
              <optgroup label="Other countries">
              <option value="213">Algeria (+213)</option>
              <option value="376">Andorra (+376)</option>
              <option value="244">Angola (+244)</option>
              <option value="1264">Anguilla (+1264)</option>
              <option value="1268">Antigua &amp; Barbuda (+1268)</option>
              <option value="54">Argentina (+54)</option>
              <option value="374">Armenia (+374)</option>
              <option value="297">Aruba (+297)</option>
              <option value="61">Australia (+61)</option>
              <option value="43">Austria (+43)</option>
              <option value="994">Azerbaijan (+994)</option>
              <option value="1242">Bahamas (+1242)</option>
              <option value="973">Bahrain (+973)</option>
              <option value="880">Bangladesh (+880)</option>
              <option value="1246">Barbados (+1246)</option>
              <option value="375">Belarus (+375)</option>
              <option value="32">Belgium (+32)</option>
              <option value="501">Belize (+501)</option>
              <option value="229">Benin (+229)</option>
              <option value="1441">Bermuda (+1441)</option>
              <option value="975">Bhutan (+975)</option>
              <option value="591">Bolivia (+591)</option>
              <option value="387">Bosnia Herzegovina (+387)</option>
              <option value="267">Botswana (+267)</option>
              <option value="55">Brazil (+55)</option>
              <option value="673">Brunei (+673)</option>
              <option value="359">Bulgaria (+359)</option>
              <option value="226">Burkina Faso (+226)</option>
              <option value="257">Burundi (+257)</option>
              <option value="855">Cambodia (+855)</option>
              <option value="237">Cameroon (+237)</option>
              <option value="238">Cape Verde Islands (+238)</option>
              <option value="1345">Cayman Islands (+1345)</option>
              <option value="236">Central African Republic (+236)</option>
              <option value="56">Chile (+56)</option>
              <option value="86">China (+86)</option>
              <option value="57">Colombia (+57)</option>
              <option value="269">Comoros (+269)</option>
              <option value="242">Congo (+242)</option>
              <option value="682">Cook Islands (+682)</option>
              <option value="506">Costa Rica (+506)</option>
              <option value="385">Croatia (+385)</option>
              <option value="53">Cuba (+53)</option>
              <option value="90392">Cyprus North (+90392)</option>
              <option value="357">Cyprus South (+357)</option>
              <option value="42">Czech Republic (+42)</option>
              <option value="45">Denmark (+45)</option>
              <option value="253">Djibouti (+253)</option>
              <option value="1809">Dominica (+1809)</option>
              <option value="1809">Dominican Republic (+1809)</option>
              <option value="593">Ecuador (+593)</option>
              <option value="20">Egypt (+20)</option>
              <option value="503">El Salvador (+503)</option>
              <option value="240">Equatorial Guinea (+240)</option>
              <option value="291">Eritrea (+291)</option>
              <option value="372">Estonia (+372)</option>
              <option value="251">Ethiopia (+251)</option>
              <option value="500">Falkland Islands (+500)</option>
              <option value="298">Faroe Islands (+298)</option>
              <option value="679">Fiji (+679)</option>
              <option value="358">Finland (+358)</option>
              <option value="33">France (+33)</option>
              <option value="594">French Guiana (+594)</option>
              <option value="689">French Polynesia (+689)</option>
              <option value="241">Gabon (+241)</option>
              <option value="220">Gambia (+220)</option>
              <option value="7880">Georgia (+7880)</option>
              <option value="49">Germany (+49)</option>
              <option value="233">Ghana (+233)</option>
              <option value="350">Gibraltar (+350)</option>
              <option value="30">Greece (+30)</option>
              <option value="299">Greenland (+299)</option>
              <option value="1473">Grenada (+1473)</option>
              <option value="590">Guadeloupe (+590)</option>
              <option value="671">Guam (+671)</option>
              <option value="502">Guatemala (+502)</option>
              <option value="224">Guinea (+224)</option>
              <option value="245">Guinea - Bissau (+245)</option>
              <option value="592">Guyana (+592)</option>
              <option value="509">Haiti (+509)</option>
              <option value="504">Honduras (+504)</option>
              <option value="852">Hong Kong (+852)</option>
              <option value="36">Hungary (+36)</option>
              <option value="354">Iceland (+354)</option>
              <option value="91">India (+91)</option>
              <option value="62">Indonesia (+62)</option>
              <option value="98">Iran (+98)</option>
              <option value="964">Iraq (+964)</option>
              <option value="353">Ireland (+353)</option>
              <option value="972">Israel (+972)</option>
              <option value="39">Italy (+39)</option>
              <option value="1876">Jamaica (+1876)</option>
              <option value="81">Japan (+81)</option>
              <option value="962">Jordan (+962)</option>
              <option value="7">Kazakhstan (+7)</option>
              <option value="254">Kenya (+254)</option>
              <option value="686">Kiribati (+686)</option>
              <option value="850">Korea North (+850)</option>
              <option value="82">Korea South (+82)</option>
              <option value="965">Kuwait (+965)</option>
              <option value="996">Kyrgyzstan (+996)</option>
              <option value="856">Laos (+856)</option>
              <option value="371">Latvia (+371)</option>
              <option value="961">Lebanon (+961)</option>
              <option value="266">Lesotho (+266)</option>
              <option value="231">Liberia (+231)</option>
              <option value="218">Libya (+218)</option>
              <option value="417">Liechtenstein (+417)</option>
              <option value="370">Lithuania (+370)</option>
              <option value="352">Luxembourg (+352)</option>
              <option value="853">Macao (+853)</option>
              <option value="389">Macedonia (+389)</option>
              <option value="261">Madagascar (+261)</option>
              <option value="265">Malawi (+265)</option>
              <option value="60">Malaysia (+60)</option>
              <option value="960">Maldives (+960)</option>
              <option value="223">Mali (+223)</option>
              <option value="356">Malta (+356)</option>
              <option value="692">Marshall Islands (+692)</option>
              <option value="596">Martinique (+596)</option>
              <option value="222">Mauritania (+222)</option>
              <option value="269">Mayotte (+269)</option>
              <option value="52">Mexico (+52)</option>
              <option value="691">Micronesia (+691)</option>
              <option value="373">Moldova (+373)</option>
              <option value="377">Monaco (+377)</option>
              <option value="976">Mongolia (+976)</option>
              <option value="1664">Montserrat (+1664)</option>
              <option value="212">Morocco (+212)</option>
              <option value="258">Mozambique (+258)</option>
              <option value="95">Myanmar (+95)</option>
              <option value="264">Namibia (+264)</option>
              <option value="674">Nauru (+674)</option>
              <option value="977">Nepal (+977)</option>
              <option value="31">Netherlands (+31)</option>
              <option value="687">New Caledonia (+687)</option>
              <option value="64">New Zealand (+64)</option>
              <option value="505">Nicaragua (+505)</option>
              <option value="227">Niger (+227)</option>
              <option value="234">Nigeria (+234)</option>
              <option value="683">Niue (+683)</option>
              <option value="672">Norfolk Islands (+672)</option>
              <option value="670">Northern Marianas (+670)</option>
              <option value="47">Norway (+47)</option>
              <option value="968">Oman (+968)</option>
              <option value="680">Palau (+680)</option>
              <option value="507">Panama (+507)</option>
              <option value="675">Papua New Guinea (+675)</option>
              <option value="595">Paraguay (+595)</option>
              <option value="51">Peru (+51)</option>
              <option value="63">Philippines (+63)</option>
              <option value="48">Poland (+48)</option>
              <option value="351">Portugal (+351)</option>
              <option value="1787">Puerto Rico (+1787)</option>
              <option value="974">Qatar (+974)</option>
              <option value="262">Reunion (+262)</option>
              <option value="40">Romania (+40)</option>
              <option value="7">Russia (+7)</option>
              <option value="250">Rwanda (+250)</option>
              <option value="378">San Marino (+378)</option>
              <option value="239">Sao Tome &amp; Principe (+239)</option>
              <option value="966">Saudi Arabia (+966)</option>
              <option value="221">Senegal (+221)</option>
              <option value="381">Serbia (+381)</option>
              <option value="248">Seychelles (+248)</option>
              <option value="232">Sierra Leone (+232)</option>
              <option value="65">Singapore (+65)</option>
              <option value="421">Slovak Republic (+421)</option>
              <option value="386">Slovenia (+386)</option>
              <option value="677">Solomon Islands (+677)</option>
              <option value="252">Somalia (+252)</option>
              <option value="27">South Africa (+27)</option>
              <option value="34">Spain (+34)</option>
              <option value="94">Sri Lanka (+94)</option>
              <option value="290">St. Helena (+290)</option>
              <option value="1869">St. Kitts (+1869)</option>
              <option value="1758">St. Lucia (+1758)</option>
              <option value="249">Sudan (+249)</option>
              <option value="597">Suriname (+597)</option>
              <option value="268">Swaziland (+268)</option>
              <option value="46">Sweden (+46)</option>
              <option value="41">Switzerland (+41)</option>
              <option value="963">Syria (+963)</option>
              <option value="886">Taiwan (+886)</option>
              <option value="7">Tajikstan (+7)</option>
              <option value="66">Thailand (+66)</option>
              <option value="228">Togo (+228)</option>
              <option value="676">Tonga (+676)</option>
              <option value="1868">Trinidad &amp; Tobago (+1868)</option>
              <option value="216">Tunisia (+216)</option>
              <option value="90">Turkey (+90)</option>
              <option value="7">Turkmenistan (+7)</option>
              <option value="993">Turkmenistan (+993)</option>
              <option value="1649">Turks &amp; Caicos Islands (+1649)</option>
              <option value="688">Tuvalu (+688)</option>
              <option value="256">Uganda (+256)</option>
              <option value="44">UK (+44)</option>
              <option value="380">Ukraine (+380)</option>
              <option value="971">United Arab Emirates (+971)</option>
              <option value="598">Uruguay (+598)</option>
              <option value="7">Uzbekistan (+7)</option>
              <option value="678">Vanuatu (+678)</option>
              <option value="379">Vatican City (+379)</option>
              <option value="58">Venezuela (+58)</option>
              <option value="84">Vietnam (+84)</option>
              <option value="84">Virgin Islands - British (+1284)</option>
              <option value="84">Virgin Islands - US (+1340)</option>
              <option value="681">Wallis &amp; Futuna (+681)</option>
              <option value="969">Yemen (North)(+969)</option>
              <option value="967">Yemen (South)(+967)</option>
              <option value="260">Zambia (+260)</option>
              <option value="263">Zimbabwe (+263)</option>
              </optgroup>
            </select>&nbsp;
            <input placeholder="123 456-7890" ref="phone" type="tel" className="form-control rule-phone" defaultValue={formatPhone(this.props.rule.phone)} />
          </div>
          <div className="form-group">
            <label className="">Message</label>
            <textarea className="form-control message" ref="message" maxLength="140" defaultValue={this.props.rule.message}></textarea>
          </div>
          {includeMap}
        </div>

        <div className="form-submit">
          <button type="submit" className="btn btn-blue pull-right" value="Post">Save</button>
          <a className="btn btn-danger btn-cancel pull-left" value="Cancel" onClick={this.cancelEdit}>Cancel</a>
        </div>
      </form>
    );
  }

  enableLocationPicker() {
    if(this.refs.addressMap) {
      $(this.refs.addressMap).locationpicker({
        location: {
          latitude: this.props.rule.latitude || 37.762275,
          longitude: this.props.rule.longitude || -122.410785
        },
        radius: this.refs.radius.value,
        inputBinding: {
          radiusInput: $(this.refs.radius),
          locationNameInput: $(this.refs.address)
        },
        enableAutocomplete: true,
        enableAutocompleteBlur: true,
        enableReverseGeocode: true,
        onchanged: _.bind(function(currentLocation, radius, isMarkerDropped) {
          this.props.rule.latitude = currentLocation.latitude;
          this.props.rule.longitude = currentLocation.longitude;
        }, this)
      });

      $(this.refs.address).keypress(function(event) {
        return event.keyCode != 13;
      });
    }
  }

  enableTimePicker() {
    $('.ui-timepicker-select', ReactDOM.findDOMNode(this))
      .prop('disabled', this.refs.allDay.checked)
      .addClass('form-control');
  }

  componentDidMount() {
    $('.start-time, .end-time', ReactDOM.findDOMNode(this)).timepicker({useSelect: true});

    this.enableTimePicker();

    this.enableLocationPicker();
  }

  componentDidUpdate() {
    this.enableLocationPicker();
  }
}
RuleForm.defaultProps = {
  rule: {},
  structures: []
};

ReactDOM.render(
  <RuleBox url="/api/rules/" countURL="/api/counts" />,
  document.getElementById('content')
);
