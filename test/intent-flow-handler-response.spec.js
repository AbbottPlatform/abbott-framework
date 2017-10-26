'use strict';

const assert = require('assert');
const chai = require('chai'),
  expect = chai.expect,
  should = chai.should();

chai.use(require('chai-json-schema'));
chai.use(require('chai-match-pattern'));

describe('IntentFlowHandler - Response', () => {
  const IntentFlowHandler = require('../lib/core/intent-flow-handler');
  
  const dataWeather = { "coord": { "lon": -74.01, "lat": 40.71 }, "weather": [{ "id": 800, "main": "Clear", "description": "clear sky", "icon": "01d" }], "base": "stations", "main": { "temp": 283.14, "pressure": 1030, "humidity": 76, "temp_min": 277.15, "temp_max": 287.15 }, "visibility": 16093, "wind": { "speed": 2.86, "deg": 23 }, "clouds": { "all": 1 }, "dt": 1506945360, "sys": { "type": 1, "id": 2121, "message": 0.0045, "country": "US", "sunrise": 1506941661, "sunset": 1506983712 }, "id": 5128581, "name": "New York", "cod": 200 };
  const dataArticles = [{ "id": "NETL_8706675990185836414", "title": "Latest News Release", "summary": "On Monday, July 29, 2013, Secretary Moniz will visit the National Energy Technology Laboratory (NETL) in Morgantown, W. Va. Moniz will tour the facility where the National Energy Technology Laboratory is leading the charge to develop clean and efficient energy technology. ...", "url": "http://netl.doe.gov/newsroom/news-releases/news-details?id=ebc5f902-b9c7-4197-abc3-2b2d35c0b6ae", "imageUrl": "http://netl.doe.gov/Image%20Library/LandingPages/topLogo.png" }, { "id": "NETL_-4789439440581346530", "title": "Latest News Release", "summary": "The National Energy Technology Laboratory (NETL) has a long and colorful story of success to tell, and I'm happy to spread the word of our many accomplishments this month, as the Energy Department's national labs celebrate their history and contributions. ...", "url": "http://netl.doe.gov/newsroom/news-releases/news-details?id=b09a1f59-e789-44cd-8ad3-bd6f0b893db3", "imageUrl": "http://netl.doe.gov/Image%20Library/newsroom/topstory/Nautilus.jpg" }, { "id": "NETL_2832650206455676994", "title": "Latest News Release", "summary": "The U.S. Department of Energy's National Energy Technology Laboratory (NETL) has released a new Funding Opportunity Announcement (FOA) entitled *\"Opportunities to Develop High Performance, Economically Viable, and Environmentally Benign Technologies to Recover Rare Earth Elements (REEs) from Domestic Coal and Coal Byproducts. *\" ...", "url": "http://netl.doe.gov/newsroom/news-releases/news-details?id=4723dcdc-7702-4fb4-a69c-0b0e154f322a", "imageUrl": "http://netl.doe.gov/Image%20Library/newsroom/topstory/REE-with-logo.jpg" }, { "id": "NETL_5207966645289878697", "title": "Latest News Release", "summary": "Researchers at the Department of Energy's National Energy Technology Laboratory (NETL) have teamed up with their Regional University Alliance (NETL-RUA) colleagues to develop a new hybrid nanostructure that could make it easier to monitor blood sugar. ...", "url": "http://netl.doe.gov/newsroom/news-releases/news-details?id=caaccce8-1268-47a3-909f-126189924554", "imageUrl": "http://netl.doe.gov/Image%20Library/publications/press/2013/Diabetes_Carbon_nanotube_armchair_povray.jpg" }, { "id": "NETL_4216228321385073197", "title": "Latest News Release", "summary": "One of the world's fastest, most energy-efficient supercomputers - expected to help energy researchers discover new materials, optimize designs and better predict operational characteristics - is up and running at the Office of Fossil Energy's National Energy Technology Laboratory (NETL) in Morgantown, W.Va ...", "url": "http://netl.doe.gov/newsroom/news-releases/news-details?id=39c843a9-6136-4973-97bf-aa6dfbedd1b4", "imageUrl": "http://netl.doe.gov/Image%20Library/publications/press/2013/inside_iso_container_with_servers.jpg" }];

  const normalizeCustomPayload = (customPayloadString) => {
    var customPayloadText = customPayloadString
    .replace(/{{/g, '{')
    .replace(/}}/g, '}');
    
    return JSON.parse(customPayloadText);
  };

  const validRootResponseSchema = {
    title: 'abbott framework response schema v1',
    type: 'object',
    required: [ 'resultMessage' ],
    properties: { }
  };
    
  describe('Abbott', () => {
    const customPayloadWeatherTemplateTextFmt = (payloadMapString) => {
      return `{
        "messageFormat": "Weather in {{cityName}}, {{country}}: Temperature: {{temperature}}, Wind Speed: {{windSpeed}}, Humidity: {{humidity}}",
        "api": {
          "response": {
            "default": {
              "cityName": "",
              "country": "",
              "temperature": "",
              "windSpeed": "",
              "humidity": ""
            },
            "map": ${payloadMapString}
          }
        }
      }`;
    };

    const customPayloadWeatherTemplateCustomFmt = (payloadMapString) => {
      return `{
        "responseAsMessage": true,
        "api": {
          "response": {
            "default": {
              "richResponse": {
                "items": [
                  {
                    "simpleResponse": {
                      "textToSpeech": ""
                    }
                  },
                  {
                    "basicCard": {
                      "formattedText": "",
                      "image": {
                        "accessibilityText": "Weather image representation"
                      },
                      "buttons": []
                    }
                  }
                ],
                "suggestions": []
              }
            },
            "map": ${payloadMapString}
          }
        }
      }`;
    };

    const validCustomResponseSchema = {
      title: 'abbott schema custom v1',
      type: 'object',
      required: [ 'richResponse' ],
      properties: {
        richResponse: {
          type: 'object',
          properties: {
            items: {
              type: 'array'
            },
            suggestions: {
              type: 'array'
            }
          }
        }    
      }
    };

    var intentFlowHandler = null;

    before(() => {
      intentFlowHandler = new IntentFlowHandler('', null, null, null, {
        type: 'abbott'
      });
    });

    describe('#_handleFetchResponse()', () => {

      it('should return a simple text response (weather)', () => {
        let customPayload = normalizeCustomPayload(customPayloadWeatherTemplateTextFmt(`{
          "name": {
            "key": "cityName"
          },
          "sys->country": {
            "key": "country"
          },
          "main->temp": {
            "key": "temperature",
            "transform": "format.compile('{{data, number, integer}} °C')({{ data: (Number(value) - 273.15) }});"
          },
          "wind->speed": {
            "key": "windSpeed",
            "transform": "value + ' m/s'"
          },
          "main->humidity": {
            "key": "humidity",
            "transform": "value + ' %'"
          }
        }`));

        var result = intentFlowHandler._handleFetchResponse(customPayload, dataWeather, null);

        result.should.be.jsonSchema(validRootResponseSchema);

        result.resultMessage.should.equal("Weather in New York, US: Temperature: 10 °C, Wind Speed: 2.86 m/s, Humidity: 76 %");
      });

      it('should return a custom message response (weather)', () => {
        let customPayload = normalizeCustomPayload(customPayloadWeatherTemplateCustomFmt(`{
          "name": {
            "key": "richResponse.items[0].simpleResponse.textToSpeech",
            "transform": "'Weather in ' + src.name + ', ' + src.sys.country"
          },
          "main->temp": {
            "key": "richResponse.items[1].basicCard.title",
            "transform": "format.compile('{{data, number, integer}} °C')({{ data: (Number(value) - 273.15) }});"
          },
          "weather[0]->icon": {
            "key": "richResponse.items[1].basicCard.image.url",
            "transform": "'http://openweathermap.org/img/w/' + value + '.png'"
          },
          "wind->speed": {
            "key": "richResponse.items[1].basicCard.formattedText",
            "transform": "textBuilder.add('**Wind:** ', value, ' m/s', '    **Humidity:** ', src.main.humidity, ' %').toString()"
          }
        }`));

        var result = intentFlowHandler._handleFetchResponse(customPayload, dataWeather, null);

        result.should.be.jsonSchema(validRootResponseSchema);

        result.resultMessage.should.be.jsonSchema(validCustomResponseSchema);
        
        chai.expect(result.resultMessage).to.matchPattern({
          richResponse: {
            items: [
              {
                simpleResponse: {
                  textToSpeech: 'Weather in New York, US'
                }
              },
              { 
                basicCard: {
                  title: '10 °C',
                  formattedText: '**Wind:** 2.86 m/s    **Humidity:** 76 %',
                  image: {
                    url: 'http://openweathermap.org/img/w/01d.png',
                    accessibilityText: 'Weather image representation'
                  },
                  buttons: []
                }
              }
            ],
            suggestions: []
          }
        });
      });
    });

  });

  describe('Slack', () => {
    const customPayloadWeatherTemplateFmt = (payloadMapString) => {
      return `{
        "responseAsMessage": true,
        "api": {
          "response": {
            "default": {
              "attachments": [
                {
                  "color": "#36a64f",
                  "fields": [
                    {
                      "title": "Wind",
                      "short": false
                    },
                    {
                      "title": "Humidity",
                      "short": false
                    }
                  ],
                  "footer": "Open Weather Map",
                  "footer_icon": "http://openweathermap.org/themes/openweathermap/assets/vendor/owm/img/icons/logo_60x60.png"
                }
              ]
            },
            "map": ${payloadMapString}
          }
        }
      }`;
    };

    const validResponseSchema = {
      title: 'slack schema v1',
      type: 'object',
      required: [ 'attachments' ],
      properties: {
        text: {
          type: 'string'
        },
        attachments: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            properties: {
              color: {
                type: 'string'
              },
              footer: {
                type: 'string'
              },
              footer_icon: {
                type: 'string'
              },
              fields: {
                type: 'array',
                minItems: 1
              }
            }
          }
        }
      }
    };

    var intentFlowHandler = null;

    before(() => {
      intentFlowHandler = new IntentFlowHandler('', null, null, null, {
        type: 'slack'
      });
    });

    describe('#_handleFetchResponse()', () => {

      it('should return a card response (weather)', () => {
        let customPayload = normalizeCustomPayload(customPayloadWeatherTemplateFmt(`{
          "name": {
            "key": "attachments[0].pretext",
            "transform": "'Weather in ' + src.name + ', ' + src.sys.country"
          },
          "main->temp": {
            "key": "attachments[0].title",
            "transform": "format.compile('{{data, number, integer}} °C')({{ data: (Number(value) - 273.15) }});"
          },
          "weather[0]->icon": {
            "key": "attachments[0].thumb_url",
            "transform": "'http://openweathermap.org/img/w/' + value + '.png'"
          },
          "wind->speed": {
            "key": "attachments[0].fields[0].value",
            "transform": "value + ' m/s'"
          },
          "main->humidity": {
            "key": "attachments[0].fields[1].value",
            "transform": "value + ' %'"
          },
          "dt": "attachments[0].ts"
        }`));

        var result = intentFlowHandler._handleFetchResponse(customPayload, dataWeather, null);

        result.should.be.jsonSchema(validRootResponseSchema);

        result.resultMessage.should.be.jsonSchema(validResponseSchema);

        chai.expect(result.resultMessage).to.matchPattern({
          attachments: [
            {
              "title": '10 °C',
              "pretext": 'Weather in New York, US',
              "color": '#36a64f',
              "fields": [
                {
                  "title": 'Wind',
                  "short": false,
                  "value": '2.86 m/s'
                },
                {
                  "title": 'Humidity',
                  "short": false,
                  "value": '76 %'
                }
              ],
              "thumb_url": 'http://openweathermap.org/img/w/01d.png',
              "footer": 'Open Weather Map',
              "footer_icon": 'http://openweathermap.org/themes/openweathermap/assets/vendor/owm/img/icons/logo_60x60.png',
              "ts": 1506945360
            }
          ]
        });
      });

    });

  });

  describe('Google', () => {
    const customPayloadWeatherTemplateFmt = (payloadMapString) => {
      return `{
        "responseAsMessage": true,
        "api": {
          "response": {
            "default": {
              "richResponse": {
                "items": [
                  {
                    "simpleResponse": {
                      "textToSpeech": ""
                    }
                  },
                  {
                    "basicCard": {
                      "formattedText": "",
                      "image": {
                        "accessibilityText": "Weather image representation"
                      },
                      "buttons": []
                    }
                  }
                ],
                "suggestions": []
              }
            },
            "map": ${payloadMapString}
          }
        }
      }`;
    };

    const validResponseSchema = {
      title: 'actions on google schema v1',
      type: 'object',
      required: [ 'richResponse' ],
      properties: {
        richResponse: {
          type: 'object',
          properties: {
            items: {
              type: 'array'
            },
            suggestions: {
              type: 'array'
            }
          }
        }
      }
    };

    var intentFlowHandler = null;

    before(() => {
      intentFlowHandler = new IntentFlowHandler('', null, null, null, {
        type: 'google'
      });
    });

    describe('#_handleFetchResponse()', () => {

      it('should return a card response (weather)', () => {
        let customPayload = normalizeCustomPayload(customPayloadWeatherTemplateFmt(`{
          "name": {
            "key": "richResponse.items[0].simpleResponse.textToSpeech",
            "transform": "'Weather in ' + src.name + ', ' + src.sys.country"
          },
          "main->temp": {
            "key": "richResponse.items[1].basicCard.title",
            "transform": "format.compile('{{data, number, integer}} °C')({{ data: (Number(value) - 273.15) }});"
          },
          "weather[0]->icon": {
            "key": "richResponse.items[1].basicCard.image.url",
            "transform": "'http://openweathermap.org/img/w/' + value + '.png'"
          },
          "wind->speed": {
            "key": "richResponse.items[1].basicCard.formattedText",
            "transform": "textBuilder.add('**Wind:** ', value, ' m/s', '    **Humidity:** ', src.main.humidity, ' %').toString()"
          }
        }`));

        var result = intentFlowHandler._handleFetchResponse(customPayload, dataWeather, null);

        result.should.be.jsonSchema(validRootResponseSchema);

        result.resultMessage.should.be.jsonSchema(validResponseSchema);

        chai.expect(result.resultMessage).to.matchPattern({
          richResponse: {
            items: [
              {
                simpleResponse: {
                  textToSpeech: 'Weather in New York, US'
                }
              },
              { 
                basicCard: {
                  title: '10 °C',
                  formattedText: '**Wind:** 2.86 m/s    **Humidity:** 76 %',
                  image: {
                    url: 'http://openweathermap.org/img/w/01d.png',
                    accessibilityText: 'Weather image representation'
                  },
                  buttons: []
                }
              }
            ],
            suggestions: []
          }
        });
      });

    });

  });

  describe('Google Chats', () => {
    const customPayloadWeatherTemplateFmt = (payloadMapString) => {
      return `{
        "responseAsMessage": true,
        "api": {
          "response": {
            "default": {},
            "map": ${payloadMapString}
          }
        }
      }`;
    };

    const validResponseSchema = {
      title: 'google chats schema v1',
      type: 'object',
      required: [ 'cards' ],
      properties: {
        cards: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            properties: {
              header: {
                type: 'object',
                properties: {
                  title: {
                    type: 'string'
                  }
                }
              },
              sections: {
                type: 'array',
                minItems: 1,
                items: {
                  type: 'object',
                  properties: {
                    widgets: {
                      type: 'array',
                      minItems: 1,
                      items: {
                        type: 'object',
                        properties: {
                          image: {
                            type: 'object',
                            properties: {
                              imageUrl: {
                                type: 'string'
                              }
                            }
                          },
                          textParagraph: {
                            type: 'object',
                            properties: {
                              text: {
                                type: 'string'
                              }
                            }
                          }                         
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    };

    var intentFlowHandler = null;

    before(() => {
      intentFlowHandler = new IntentFlowHandler('', null, null, null, {
        type: 'gchats'
      });
    });

    describe('#_handleFetchResponse()', () => {

      it('should return a card response (weather)', () => {
        let customPayload = normalizeCustomPayload(customPayloadWeatherTemplateFmt(`{
          "name": {
            "key": "cards[]+.header.title",
            "transform": "'Weather in ' + src.name + ', ' + src.sys.country"
          },
          "weather[0]->icon": {
            "key": "cards[]+.sections[]+.widgets[0]+.image.imageUrl",
            "transform": "'http://openweathermap.org/img/w/' + value + '.png'"
          },
          "main->temp": {
            "key": "cards[]+.sections[]+.widgets[1]+.textParagraph.text",
            "transform": "format.compile('{{data, number, integer}} °C')({{ data: (Number(value) - 273.15) }});"
          },
          "wind->speed": {
            "key": "cards[]+.sections[]+.widgets[2]+.textParagraph.text",
            "transform": "textBuilder.add('Wind: ', value, ' m/s', '    Humidity: ', src.main.humidity, ' %').toString()"
          }
        }`));

        var result = intentFlowHandler._handleFetchResponse(customPayload, dataWeather, null);

        result.should.be.jsonSchema(validRootResponseSchema);

        result.resultMessage.should.be.jsonSchema(validResponseSchema);

        chai.expect(result.resultMessage).to.matchPattern({
          cards: [
            {
              header: {
                title: 'Weather in New York, US'
              },
              sections: [
                {
                  widgets: [
                    {
                      image: {
                        imageUrl: 'http://openweathermap.org/img/w/01d.png'
                      }
                    },
                    {
                      textParagraph: {
                        text: '10 °C'
                      }
                    },
                    {
                      textParagraph: {
                        text: 'Wind: 2.86 m/s    Humidity: 76 %'
                      }
                    }
                  ]
                }
              ]
            }
          ]
        });
      });

    });

  });

  describe('Facebook', () => {
    const customPayloadWeatherTemplateFmt = (payloadMapString) => {
      return `{
        "responseAsMessage": true,
        "api": {
          "response": {
            "default": {
              "attachment": {
                "type": "template",
                "payload": {
                  "template_type": "generic",
                  "elements": [
                    {
                      "title": "",
                      "image_url": "",
                      "subtitle": ""
                    }
                  ]
                }
              }
            },
            "map": ${payloadMapString}
          }
        }
      }`;
    };

    const validResponseSchema = {
      title: 'facebook schema v1',
      type: 'object',
      required: [ 'attachment' ],
      properties: {
        attachment: {
          type: 'object',
          properties: {
            type: {
              type: 'string'
            },
            payload: {
              type: 'object',
              properties: {
                template_type: {
                  type: 'string'
                },
                elements: {
                  type: 'array',
                  minItems: 1,
                  items: {
                    type: 'object',
                    properties: {
                      title: {
                        type: 'string',
                      },
                      image_url: {
                        type: 'string',
                      },
                      subtitle: {
                        type: 'string',
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    };

    var intentFlowHandler = null;

    before(() => {
      intentFlowHandler = new IntentFlowHandler('', null, null, null, {
        type: 'facebook'
      });
    });

    describe('#_handleFetchResponse()', () => {

      it('should return a card response (weather)', () => {
        let customPayload = normalizeCustomPayload(customPayloadWeatherTemplateFmt(`{
          "name": {
            "key": "attachment.payload.elements[0].title",
            "transform": "'Weather in ' + src.name + ', ' + src.sys.country"
          },
          "main->temp": {
            "key": "attachment.payload.elements[0].subtitle",
            "transform": "format.compile('Temperature: {{temperature, number, integer}} °C, Wind Speed: {{windSpeed}}, Humidity: {{humidity}}')({{ temperature: (Number(value) - 273.15), windSpeed: src.wind.speed + ' m/s', humidity: src.main.humidity + ' %' }});"
          },
          "weather[0]->icon": {
            "key": "attachment.payload.elements[0].image_url",
            "transform": "'http://openweathermap.org/img/w/' + value + '.png'"
          }
        }`));

        var result = intentFlowHandler._handleFetchResponse(customPayload, dataWeather, null);

        result.should.be.jsonSchema(validRootResponseSchema);

        result.resultMessage.should.be.jsonSchema(validResponseSchema);

        chai.expect(result.resultMessage).to.matchPattern({
          attachment: {
            type: 'template',
            payload: {
              template_type: 'generic',
              elements: [
                {
                  title: 'Weather in New York, US',
                  subtitle: 'Temperature: 10 °C, Wind Speed: 2.86 m/s, Humidity: 76 %',
                  image_url: 'http://openweathermap.org/img/w/01d.png',
                }
              ]
            }
          }
        });
      });

    });

  });
});