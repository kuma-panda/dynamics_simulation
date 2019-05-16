
//==============================================================================
class Timer
{
     constructor(){
          this.m_active = false;
          this.m_startTime = Date.now();
          this.m_stopTime  = this.m_startTime;
     }

     get active(){
          return this.m_active;
     }

     get time(){
          if( !this.m_active )
          {
               return this.m_stopTime - this.m_startTime;
          }
          return (Date.now() - this.m_startTime)/1000;
     }

     start(){
          if( !this.m_active )
          {
               this.m_startTime = Date.now() - (this.m_stopTime - this.m_startTime);
               this.m_active = true;
          }
     }

     stop(){
          if( this.m_active )
          {
               this.m_stopTime = Date.now();
               this.m_active = false;
          }
     }

     reset(){
          this.m_active = false;
          this.m_startTime = Date.now();
          this.m_stopTime  = this.m_startTime;
     }
}

//==============================================================================
class MotionProfile
{
     constructor(f){
          this.m_startTime = 0;
          this.m_endTime = 0;
          this.m_initialPosition = 0;
          this.m_initialVelocity = 0;
          this.m_hasMotion = true;
     }

     get startTime(){
          return this.m_startTime;
     }
     get endTime(){
          return this.m_endTime;
     }
     get initialPosition(){
          return this.m_initialPosition;
     }
     set initialPosition(p){
          this.m_initialPosition = p;
     }
     get initialVelocity(){
          return this.m_initialVelocity;
     }
     set initialVelocity(v){
          this.m_initialVelocity = v;
     }
     get hasMotion(){
          return this.m_hasMotion;
     }
     set hasMotion(f){
          this.m_hasMotion = f;
     }

     inTimeRange(t){
          return (this.m_startTime <= t) && (t <= this.m_endTime);
     }

     setTimeSpan(ts, te){
          this.m_startTime = Math.min(ts, te);
          this.m_endTime = Math.max(ts, te);
     }

     getVelocity(t){
          return 0;
     }

     getPosition(t){
          return 0;
     }
}

//==============================================================================
class VerticalProfile extends MotionProfile
{
     constructor(){
          super();
     }

     getVelocity(t){
          if( !this.m_hasMotion )
          {
               return 0;
          }
          t -= this.m_startTime;
          return this.m_initialVelocity - 9.8*t;
     }

     getPosition(t){
          t -= this.m_startTime;
          return Math.max(0, this.m_initialPosition + this.m_initialVelocity*t - 4.9*t*t);
     }
}

//==============================================================================
class HorizontalProfiile extends MotionProfile
{
     constructor(friction){
          super();
          this.m_frictionCoeff = friction || 0;
     }

     getVelocity(t){
          t -= this.m_startTime;
          return Math.max(0, this.m_initialVelocity - 9.8*this.m_frictionCoeff*t);
     }

     getPosition(t){
          t -= this.m_startTime;
          return this.m_initialPosition + t*this.m_initialVelocity - 4.9*this.m_frictionCoeff*t*t;
     }
}


//==============================================================================
class Ball
{
     //-------------------------------------------------------------------------
     constructor(){
          this.m_startPosition = {
               x: 0,     // ボールの初期位置（水平方向，単位m，右方向を正）
               y: 50     // ボールの初期位置（鉛直方向，単位m，上方向を正）
          };
          this.m_startVelocity = {
               x: 10,    // 水平方向の初速度 (m/s)
               y: 20     // 鉛直方向の初速度 (m/s)
          }

          this.m_timer = new Timer();

          this.m_coeff = {
               x: 0.05,  // 床を転がり始めてからの，動摩擦係数（水平方向にのみ作用）
               y: 0.3    // ボールと床の反発係数（鉛直方向にのみ作用）
          };
          
          this.m_motionProfiles = {
               x: [],
               y: []
          };

          this.calcProfile();
     }

     //-------------------------------------------------------------------------
     get startPosition(){
          return this.m_startPosition;
     }
     get startVelocity(){
          return this.m_startVelocity;
     }
     get coefficient(){
          return this.m_coeff;
     }
     get active(){
          return this.m_timer.time > 0;
     }

     //-------------------------------------------------------------------------
     setStartPosition(xy, val){
          if( xy !== 'x' && xy !== 'y' )
          {
               return;
          }
          if( val < 0 || val >= 90 )
          {
               return;
          }
          this.m_startPosition[xy] = val;
          this.reset();
          this.calcProfile();
     }

     //-------------------------------------------------------------------------
     setStartVelocity(xy, val){
          if( xy !== 'x' && xy !== 'y' )
          {
               return;
          }
          if( val < 0 || val > 200 )
          {
               return;
          }
          this.m_startVelocity[xy] = val;
          this.reset();
          this.calcProfile();
     }

     //-------------------------------------------------------------------------
     setCoefficient(xy, val){
          if( xy !== 'x' && xy !== 'y' )
          {
               return;
          }
          if( val < 0.01 )
          {
               return;
          }
          if( xy === 'y' && val >= 1.0 )
          {
               return;
          }
          this.m_coeff[xy] = val;
          this.reset();
          this.calcProfile();
     }

     //-------------------------------------------------------------------------
     reset(){
          this.m_timer.reset();
     }

     //-------------------------------------------------------------------------
     start(){
          this.m_timer.start();
     }

     //-------------------------------------------------------------------------
     pause(){
          if( this.m_timer.active )
          {
               this.m_timer.stop();
          }
          else
          {
               this.m_timer.start();
          }
     }

     //-------------------------------------------------------------------------
     calcProfile(){
          this.m_motionProfiles = {
               x: [],
               y: []
          };

          // 垂直方向の運動 ****************************************************
          let v = this.m_startVelocity.y;
          let h = this.m_startPosition.y;
          let e = this.m_coeff.y;  // 反発係数
          let t = (v + Math.sqrt(v*v + 2*9.8*h))/9.8;  // 最初の投射から，床に落下するまでの時間(s)

          // 投射してから，最初に床に落下するまでの運動
          let prof = new VerticalProfile();
          prof.initialPosition = h;
          prof.initialVelocity = v;
          prof.setTimeSpan(0, t);
          this.m_motionProfiles.y.push(prof);

          // それ以降の運動（床で跳ね返り，また床に落下するまで）
          v = Math.abs(v - 9.8*t);           // 床に衝突する直前の鉛直方向の速度の大きさ(m/s)
          let te =  t + (2*v/9.8)*e/(1-e);   // 理論上の，投げ始めてからボールが床に着地するまでの時間
          let dt;
          do
          {          
               v = v*e;       // 床で跳ね返った直後の鉛直方向の初速度の大きさ(m/s)
               dt = 2*v/9.8;  // 次に床に衝突するまでの滞空時間
               prof = new VerticalProfile();
               prof.initialPosition = 0;
               prof.initialVelocity = v;
               prof.setTimeSpan(t, t+dt);
               this.m_motionProfiles.y.push(prof);
               t += dt;
          }
          while( te - t > 0.005 );      // 運動は無限に続くので，しきい値を決める
          // 最後の運動．最終的には床に着地し，それ以上は跳ね返らない状態
          v = v*e;
          prof = new VerticalProfile();
          prof.initialPosition = 0;
          prof.initialVelocity = v;
          prof.setTimeSpan(t, te);
          this.m_motionProfiles.y.push(prof);

          prof = new VerticalProfile();
          prof.setTimeSpan(te, 3600*8760);
          prof.hasMotion = false;
          this.m_motionProfiles.y.push(prof);

          // 水平方向の運動 ****************************************************
          v = this.m_startVelocity.x;   // 水平方向の初速度(m/s)
          let u = this.m_coeff.x;       // 床とボールの動摩擦係数
          let tx = v / (u * 9.8);       // 床面上の転がり運動を開始してから，停止するまでの時間(s)

          prof = new HorizontalProfiile(0);
          prof.initialPosition = 0;
          prof.initialVelocity = v;
          prof.setTimeSpan(0, te);          
          this.m_motionProfiles.x.push(prof);

          prof = new HorizontalProfiile(u);
          prof.initialPosition = v * te;
          prof.initialVelocity = v;
          prof.setTimeSpan(te, te+tx);
          this.m_motionProfiles.x.push(prof);

          prof = new HorizontalProfiile(0);
          prof.initialPosition = this.m_motionProfiles.x[1].getPosition(te+tx);
          prof.setTimeSpan(te+tx, 3600*8760);
          prof.hasMotion = false;
          this.m_motionProfiles.x.push(prof);

          console.log(this.m_motionProfiles);
     }

     //-------------------------------------------------------------------------
     getValues(){
          let t = this.m_timer.time;
          let profX = this.m_motionProfiles.x.find(function(item){
               return item.inTimeRange(t);
          });
          let profY = this.m_motionProfiles.y.find(function(item){
               return item.inTimeRange(t);
          });
          return {
               time: profX.hasMotion? t : profX.startTime,
               position: {
                    x: profX.getPosition(t),
                    y: profY.getPosition(t)
               },
               velocity: {
                    x: profX.getVelocity(t),
                    y: profY.getVelocity(t)
               }
          }
     }
}

//------------------------------------------------------------------------------
function formatFloat(val)
{
     let s = (val < 0)? '－' : '　';
     val = Math.abs(val);
     let d = Math.floor(val);
     let f = Math.round((val - d)*1000);
     return s + d + '.' + ('00'+f).slice(-3);     
}


//------------------------------------------------------------------------------
let ball = new Ball();
let canvas = null;
let started = false;

//------------------------------------------------------------------------------
function setup()
{
     console.log('setup');
     canvas = createCanvas(4000, 640);
     noStroke();
     fill(255);
     textSize(14);
     noLoop();
}

//------------------------------------------------------------------------------
function draw(){
     if( !started ){ return; }
     background(0, ball.active? 10 : 100);
     fill(128,128,128);
     let h = 6*ball.startPosition.y;
     rect(0, 600-h, 100, h);

     let values = ball.getValues();
     fill(255,255,0);
     ellipse(6*values.position.x+100, 595-6*values.position.y, 10, 10);

     stroke(128);
     line(0, 600, 4000, 600);
     fill(128);
     for( let n = 0 ; n < 67 ; n++ )
     {
          let x = 100 + n*60;
          line(x, 600, x, 610);
          if( (n % 10) === 0 )
          {
               let s = ''+(n*10);
               text(s, x-textWidth(s)/2, 620);
          }
     }

     noStroke();
}

//------------------------------------------------------------------------------
function displayValues(){
     let values = ball.getValues();
     $$('elapsed-time').define('label', `${formatFloat(values.time)} sec`);
     $$('elapsed-time').refresh();
     $$('pos-x').define('label', `${formatFloat(values.position.x)} m`);
     $$('pos-x').refresh(); 
     $$('vel-x').define('label', `${formatFloat(values.velocity.x)} m/sec`);
     $$('vel-x').refresh(); 
     $$('pos-y').define('label', `${formatFloat(values.position.y)} m`);
     $$('pos-y').refresh(); 
     $$('vel-y').define('label', `${formatFloat(values.velocity.y)} m/sec`);
     $$('vel-y').refresh();
     setTimeout(function(){
          displayValues();
     }, 50); 
}

//------------------------------------------------------------------------------
webix.ready(function(){
     console.log('webix.ready');
     webix.ui({
          type: 'wide',
          cols: [
               {
                    type: 'clean',
                    rows: [
                         {
                              view: 'toolbar',
                              height: 40,
                              cols: [
                                   {
                                        view: 'button',
                                        width: 120,
                                        label: 'スタート',
                                        click: function(){
                                             $$('canvas').scrollTo(0, 0);
                                             ball.start();
                                        }
                                   },
                                   {
                                        view: 'button',
                                        width: 120,
                                        disabled: true,
                                        label: '一時停止',
                                        click: function(){
                                             ball.pause();
                                        }
                                   },
                                   {
                                        view: 'button',
                                        width: 120,
                                        label: 'リセット',
                                        click: function(){
                                             $$('canvas').scrollTo(0, 0);
                                             ball.reset();
                                        }
                                   },
                                   {}
                              ]
                         },
                         {
                              view: 'toolbar',
                              height: 40,
                              cols: [
                                   {view:'label', label:'Elapsed : ', align:'right', width: 100},
                                   {view:'label', label:'999.9 sec', align:'right', width: 150, id:'elapsed-time'},
                                   {},
                                   {view:'label', label:'Horizontal : ', align:'right', width:150},
                                   {view:'label', label:'000.000 m', align:'right', width:100, id: 'pos-x'},
                                   {view:'label', label:'-000.000 m/sec', align:'right', width:150, id: 'vel-x'},
                                   {},
                                   {view:'label', label:'Vertical : ', align:'right', width:150},
                                   {view:'label', label:'000.000 m', align:'right', width:100, id: 'pos-y'},
                                   {view:'label', label:'-000.000 m/sec', align:'right', width:150, id: 'vel-y'},
                                   {}
                              ]
                         },
                         {
                              id: 'canvas',
                              scroll: 'xy',
                              css: {'background': 'black'},
                              template: '<div id="canvas-container"></div>'
                         }
                    ]
               },
               {
                    view: 'resizer',
               },
               {
                    width: 300,
                    maxWidth: 500,
                    minWidth: 250,
                    nameWidth: 150,
                    editable: true,
                    view: 'property',
                    id: 'ballprops',
                    elements: [
                         {label:'水平方向', type:'label'},
                         {label:'初速度（m/sec）', type:'text', value: '100', id:'101', setter:'setStartVelocity', getter:'startVelocity', axis:'x'},
                         {label:'動摩擦係数', type:'text', value:'1.0', id:'102', setter:'setCoefficient', getter:'coefficient', axis:'x'},
                         {label:'', value:''},
                         {label:'垂直方向', type:'label'},
                         {label:'初速度（m/sec）', type:'text', value: '200', id:'201', setter:'setStartVelocity', getter:'startVelocity', axis:'y'},
                         {label:'スタート高さ（m）', type:'text', value: '10', id:'202', setter:'setStartPosition', getter:'startPosition', axis:'y'},
                         {label:'反発係数', type:'text', value:'0.1', id:'203', setter:'setCoefficient', getter:'coefficient', axis:'y'}
                    ]
               }
          ]
     });

     $$('ballprops').attachEvent('onAfterEditStop', function(s, e){
          console.log(s);
          console.log(e);
          if( s.value !== s.old )
          {
               ball[e.config.setter](e.config.axis, parseFloat(s.value));
               $$('ballprops').setValues(e.config.id, ball[e.config.getter][e.config.axis]);
               $$('canvas').scrollTo(0, 0);
          }
     });

     // console.log($$('ballprops').config.elements);

     let props = {};
     $$('ballprops').config.elements.forEach(function(e){
          console.log(e);
          if( e.id && e.getter && e.axis )
          {
               props[e.id] = ball[e.getter][e.axis];
          }
     });
     $$('ballprops').setValues(props);

     // $$('ballprops').data.forEach(function(item){
     //      $$('ballprops').setValues(item.id, ball[item.getter][item.axis]);
     // });

     canvas.parent('canvas-container');
     $('#canvas-container').width(4000).height(640).parent().width(4000).height(640);
     started = true;
     loop();
     displayValues();
});
