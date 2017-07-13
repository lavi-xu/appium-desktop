import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { debounce } from 'lodash';
import styles from './Inspector.css';
import { Button, Row, Col, Input, Modal, Table, Alert } from 'antd';

const ButtonGroup = Button.Group;

const STRATEGY_MAPPINGS = {
  name: 'accessibility id',
  "content-desc": 'accessibility id',
  id: 'id',
  "resource-id": 'id',
};

/**
 * Shows details of the currently selected element and shows methods that can
 * be called on the elements (tap, sendKeys)
 */
export default class SelectedElement extends Component {

  constructor (props) {
    super(props);
    this.state = {};
    this.handleSendKeys = this.handleSendKeys.bind(this);
    this.debouncedCalculateContainerStyles = debounce(this.calculateContainerStyles.bind(this), 300);
  }

  componentDidMount () {
    window.addEventListener('resize', this.debouncedCalculateContainerStyles);
    this.calculateContainerStyles();
  }

  componentDidUnmount () {
    window.removeEventListener('resize', this.debouncedCalculateContainerStyles);
  }

  handleSendKeys () {
    const {sendKeys, applyClientMethod, hideSendKeysModal, selectedElement} = this.props;
    const {xpath} = selectedElement;
    applyClientMethod({methodName: 'sendKeys', xpath, args: [sendKeys]});
    hideSendKeysModal();
  }

  /**
   * Callback when window is resized or when component mounts
   * 
   * This calculates what the height of the selectedElement info should be. This is a hack
   * fix because antd CSS is a little tricky to deal with.
   * 
   * This gets the distance of the top of the container from the top of the page and then
   * sets the height to that minus a 10px buffer. Overflow is set to auto so that it's scrollable.
   * 
   * If we don't do this, overflow is clipped and we can't scroll selected elements
   */
  calculateContainerStyles () {
    if (this.selectedElContainer) {
      const distanceFromTop = this.selectedElContainer.getBoundingClientRect().top + window.scrollY;
      this.setState({
        containerStyle: {
          height: window.innerHeight - distanceFromTop - 10,
          overflow: 'auto',
          paddingBottom: '1em',
        }
      });
    }
  }

  render () {
    const {applyClientMethod, setFieldValue, sendKeys, selectedElement, sendKeysModalVisible, showSendKeysModal, hideSendKeysModal} = this.props;
    const {attributes, xpath} = selectedElement;

    // Translate attributes into an array so we can iterate over them
    let attrArray = Object
      .keys(attributes || {})
      .filter((attrName) => attrName !== 'path')
      .map((attrName) => {
        return {
          name: attrName,
          value: attributes[attrName],
        };
      });

    let columns = [{
      title: 'Attribute',
      dataIndex: 'name',
      key: 'name',
      width: 100
    }, {
      title: 'Value',
      dataIndex: 'value',
      key: 'value'
    }];

    let dataSource = attrArray.map((attr) => {
      return {
        key: attr.name,
        name: attr.name,
        value: attr.value,
      };
    });

    let findColumns = [{
      title: 'Find By',
      dataIndex: 'find',
      key: 'find',
      width: 100
    }, {
      title: 'Selector',
      dataIndex: 'selector',
      key: 'selector'
    }];

    let findDataSource = [], showXpathWarning = false;

    for (let key of Object.keys(STRATEGY_MAPPINGS)) {
      if (attributes[key]) {
        findDataSource.push({
          key: STRATEGY_MAPPINGS[key],
          find: STRATEGY_MAPPINGS[key],
          selector: attributes[key]
        });
      }
    }

    if (!findDataSource.length && xpath) {
      findDataSource.push({
        key: 'xpath',
        find: 'xpath',
        selector: xpath,
      });
      showXpathWarning = true;
    }

    return <div>
      <Row justify="center" type="flex" align="middle" gutter={10} className={styles.elementActions}>
        <Col>
          <ButtonGroup size="small">
            <Button id='btnTapElement' onClick={() => applyClientMethod({methodName: 'click', xpath})}>Tap</Button>
            <Button id='btnSendKeysToElement' onClick={() => showSendKeysModal()}>Send Keys</Button>
            <Button id='btnClearElement' onClick={() => applyClientMethod({methodName: 'clear', xpath})}>Clear</Button>
          </ButtonGroup>
        </Col>
      </Row>
      <div style={this.state.containerStyle} ref={(el) => this.selectedElContainer=el}>
      {findDataSource.length > 0 && <Table columns={findColumns} dataSource={findDataSource} size="small" pagination={false} />}
      <br />
      {showXpathWarning &&
        <div>
          <Alert
           message="Using XPath locators is not recommended and can lead to fragile tests. Ask your development team to provide unique accessibility locators instead!"
           type="warning"
           showIcon
          />
          <br />
        </div>
      }
      {dataSource.length > 0 &&
      <Row>
        <Table columns={columns} dataSource={dataSource} size="small" pagination={false} />
      </Row>
      }
      </div>

      <Modal title='Send Keys'
        visible={sendKeysModalVisible}
        okText='Send Keys'
        cancelText='Cancel'
        onCancel={hideSendKeysModal}
        onOk={this.handleSendKeys}>
            <Input placeholder='Enter keys' value={sendKeys} onChange={(e) => setFieldValue('sendKeys', e.target.value)} />
      </Modal>
    </div>;
  }
}
