const IntentFlowHandler = require('../lib/core/intent-flow-handler');

var data = [{"id":"NETL_8706675990185836414","title":"Latest News Release","summary":"On Monday, July 29, 2013, Secretary Moniz will visit the National Energy Technology Laboratory (NETL) in Morgantown, W. Va. Moniz will tour the facility where the National Energy Technology Laboratory is leading the charge to develop clean and efficient energy technology. ...","url":"http://netl.doe.gov/newsroom/news-releases/news-details?id=ebc5f902-b9c7-4197-abc3-2b2d35c0b6ae","imageUrl":"http://netl.doe.gov/Image%20Library/LandingPages/topLogo.png"},{"id":"NETL_-4789439440581346530","title":"Latest News Release","summary":"The National Energy Technology Laboratory (NETL) has a long and colorful story of success to tell, and I'm happy to spread the word of our many accomplishments this month, as the Energy Department's national labs celebrate their history and contributions. ...","url":"http://netl.doe.gov/newsroom/news-releases/news-details?id=b09a1f59-e789-44cd-8ad3-bd6f0b893db3","imageUrl":"http://netl.doe.gov/Image%20Library/newsroom/topstory/Nautilus.jpg"},{"id":"NETL_2832650206455676994","title":"Latest News Release","summary":"The U.S. Department of Energy's National Energy Technology Laboratory (NETL) has released a new Funding Opportunity Announcement (FOA) entitled *\"Opportunities to Develop High Performance, Economically Viable, and Environmentally Benign Technologies to Recover Rare Earth Elements (REEs) from Domestic Coal and Coal Byproducts. *\" ...","url":"http://netl.doe.gov/newsroom/news-releases/news-details?id=4723dcdc-7702-4fb4-a69c-0b0e154f322a","imageUrl":"http://netl.doe.gov/Image%20Library/newsroom/topstory/REE-with-logo.jpg"},{"id":"NETL_5207966645289878697","title":"Latest News Release","summary":"Researchers at the Department of Energy's National Energy Technology Laboratory (NETL) have teamed up with their Regional University Alliance (NETL-RUA) colleagues to develop a new hybrid nanostructure that could make it easier to monitor blood sugar. ...","url":"http://netl.doe.gov/newsroom/news-releases/news-details?id=caaccce8-1268-47a3-909f-126189924554","imageUrl":"http://netl.doe.gov/Image%20Library/publications/press/2013/Diabetes_Carbon_nanotube_armchair_povray.jpg"},{"id":"NETL_4216228321385073197","title":"Latest News Release","summary":"One of the world's fastest, most energy-efficient supercomputers - expected to help energy researchers discover new materials, optimize designs and better predict operational characteristics - is up and running at the Office of Fossil Energy's National Energy Technology Laboratory (NETL) in Morgantown, W.Va ...","url":"http://netl.doe.gov/newsroom/news-releases/news-details?id=39c843a9-6136-4973-97bf-aa6dfbedd1b4","imageUrl":"http://netl.doe.gov/Image%20Library/publications/press/2013/inside_iso_container_with_servers.jpg"}];

/*
        "[]->url": ["cards[]+.sections[]+.widgets[2]+.buttons[0].textButton.onClick.link", {
        	"key": "cards[]+.sections[]+.widgets[2]+.buttons[0].textButton.text",
        	"transform": "'READ ARTICLE'"
        }],
*/

var body_customPayload = `{
  "apiURL": "http://35.184.149.142:8080/api/cto-radar/v1/articles?topicId={{topicId}}&initDate=20170501&finalDate=20170505&max=5",
  "responseAsMessage": true,
  "api": {
    "response": {
      "default": {},
      "map": {
        "[]->title": "cards[]+.header.title",
        "[]->imageUrl": "cards[]+.sections[]+.widgets[0]+.image.imageUrl",
        "[]->summary": "cards[]+.sections[]+.widgets[1]+.textParagraph.text",
        "[]->url": "cards[]+.sections[]+.widgets[2]+.buttons[0]+.textButton.onClick.link",
        "url_text": {
      		"key": "cards[]+.sections[]+.widgets[2]+.buttons[0].textButton.text",
      		"default": "(() => { toObject.cards.forEach((item) => { item.sections[0].widgets[2].buttons[0].textButton.text = 'READ ARTICLE' }); })()"
    		}
      }
    }
  }
}`;

var customPayloadText = body_customPayload
.replace(/{{/g, '{')
.replace(/}}/g, '}');
var customPayload = JSON.parse(customPayloadText);

var intentFlowHandler = new IntentFlowHandler('', null, null, null, {
  type: 'abbott'
});

var result = intentFlowHandler._handleFetchResponse(customPayload, data, null);

console.dir(result.resultMessage);