(function(global){
'use strict';
const CAMPAIGN_CHAPTER_DURATION=6000;
const CAMPAIGN_CHAPTERS={
  1:{number:1,arena:'crypt',image:'assets/chapters/chapter-1.jpg',atmosphere:[],particles:[
    ['ash',20],['green-spark',10],['dark-dust',12],['stone',2]
  ]},
  6:{number:2,arena:'forest',image:'assets/chapters/chapter-2.jpg',atmosphere:['campaign-chapter-fog'],particles:[
    ['web-thread',9],['spore',16],['red-dust',12],['eye',5]
  ]},
  11:{number:3,arena:'snow',image:'assets/chapters/chapter-3.jpg',atmosphere:['campaign-chapter-cold-vapor'],particles:[
    ['snow',28],['crystal',11],['ice-fragment',6]
  ]},
  16:{number:4,arena:'desert',image:'assets/chapters/chapter-4.jpg',atmosphere:['campaign-chapter-heat'],particles:[
    ['sand',18],['gold-dust',16],['rolling-stone',3]
  ]},
  21:{number:5,arena:'volcano',image:'assets/chapters/chapter-5.jpg',atmosphere:['campaign-chapter-lava-pulse'],particles:[
    ['ember',18],['black-ash',16],['orange-spark',12],['smoke',5]
  ]}
};

global.MagoCampaignChapterData=Object.freeze({
  CAMPAIGN_CHAPTER_DURATION,
  CAMPAIGN_CHAPTERS
});
})(window);
