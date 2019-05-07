import React, { Component } from 'react';
import { Platform, StyleSheet, ScrollView, Image, Text, View, TouchableOpacity } from 'react-native';
import Tflite from 'tflite-react-native';
import ImagePicker from 'react-native-image-picker';
import { RNCamera } from 'react-native-camera';

let tflite = new Tflite();

const height = 350;
const width = 350;
const blue = "#25d5fd";
const mobile = "MobileNet";
const ssd = "SSD MobileNet";
const open_pose = "Open Pose";
const yolo = "Tiny YOLOv2";
const INIT_STATE = {
  model: null,
  source: null,
  imageHeight: height,
  imageWidth: width,
  recognitions: []
};

export default class App extends Component {
  constructor(props) {
    super(props);
    this.state = INIT_STATE;
  }

  componentDidMount(){
    this.onSelectModel(open_pose);
    // this.onSelectImage()
  }

  onSelectModel(model) {
    this.setState({ ...INIT_STATE, model });
    switch (model) {
      case open_pose:
        var modelFile = 'models/open_pose.tflite';
        var labelsFile = 'models/ssd_mobilenet.txt';
        break;
      case ssd:
        var modelFile = 'models/ssd_mobilenet.tflite';
        var labelsFile = 'models/ssd_mobilenet.txt';
        break;
      case yolo:
        var modelFile = 'models/yolov2_tiny.tflite';
        var labelsFile = 'models/yolov2_tiny.txt';
        break;
      default:
        var modelFile = 'models/mobilenet_v1_1.0_224.tflite';
        var labelsFile = 'models/mobilenet_v1_1.0_224.txt';
    }
    tflite.loadModel({
      model: modelFile,
      labels: labelsFile,
    },
      (err, res) => {
        if (err)
          console.log(err);
        else
          console.log(res);
      });
  }

  launchDetection(imgPath, imgWidth, imgHeight ) {
    this.setState({
      source: { uri: imgPath },
      imageHeight: imgHeight * width / imgWidth,
      imageWidth: width
    });

    switch (this.state.model) {
      case open_pose:
        tflite.runModelOnImage({
          path: imgPath,
          imageMean: 128.0,
          imageStd: 128.0,
          numResults: 3,
          threshold: 0.05
        },
          (err, res) => {
            if (err)
              console.log(err);
            else {
              let i = res.i;
              let j = res.j;
              i = i * 318 / 46  * imgHeight / 318;
              j = j * imgWidth / 46;
              res.i = i;
              res.j = j;
              this.setState({ recognitions: res });
            }
          });
        break;
      case ssd:
        tflite.detectObjectOnImage({
          path: imgPath,
          threshold: 0.2,
          numResultsPerClass: 1,
        },
          (err, res) => {
            if (err)
              console.log(err);
            else
              this.setState({ recognitions: res });
          });
        break;
      case yolo:
        tflite.detectObjectOnImage({
          path: imgPath,
          model: 'YOLO',
          imageMean: 0.0,
          imageStd: 255.0,
          threshold: 0.4,
          numResultsPerClass: 1,
        },
          (err, res) => {
            if (err)
              console.log(err);
            else
              this.setState({ recognitions: res });
          });
        break;
      default:
      try{
        tflite.runModelOnImage({
          path,
          imageMean: 128.0,
          imageStd: 128.0,
          numResults: 3,
          threshold: 0.05
        },
          (err, res) => {
            if (err){
              console.log(err);
              if(err = 'err'){alert('open pose sucess!')}
            }
            else
              this.setState({ recognitions: res });
          });

      }catch(e){
        console.log(e)
      }
      
    }
  }

  onSelectImage() {
    const options = {
      title: 'Select Avatar',
      customButtons: [{ name: 'fb', title: 'Choose Photo from Facebook' }],
      storageOptions: {
        skipBackup: true,
        path: 'images',
      },
    };
    ImagePicker.launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.error) {
        console.log('ImagePicker Error: ', response.error);
      } else if (response.customButton) {
        console.log('User tapped custom button: ', response.customButton);
      } else {
        var path = Platform.OS === 'ios' ? response.uri : 'file://' + response.path;
        var w = response.width;
        var h = response.height;
        this.launchDetection(path, w, h)
      }
    });
  }

  renderBoxes() {
    const { model, recognitions, imageHeight, imageWidth } = this.state;
    if (model != mobile)
      return recognitions.sort((valA,valB) =>  - valA["confidenceInClass"] + valB["confidenceInClass"]).filter((_,i) => i < 3).map((res, id) => {
        var left = res["rect"]["x"] * imageWidth;
        var top = res["rect"]["y"] * imageHeight;
        var width = res["rect"]["w"] * imageWidth;
        var height = res["rect"]["h"] * imageHeight;
        return (
          <View key={id} style={[styles.box, { top, left, width, height }]}>
            <Text style={{ color: 'white', backgroundColor: '#'+Math.floor(Math.random()*16777215).toString(16) }}>
              {res["detectedClass"] + " " + (res["confidenceInClass"] * 100).toFixed(0) + "%"}
            </Text>
          </View>
        )
      });
  }

  render() {
    const { model, source, imageHeight, imageWidth } = this.state;
    var renderButton = (m) => {
      return (
        <TouchableOpacity style={[styles.button, {backgroundColor:this.state.model == m ?'#25d5fd':'lightgrey'}]} onPress={this.onSelectModel.bind(this, m)}>
          <Text style={styles.buttonText}>{m}</Text>
        </TouchableOpacity>
      );
    }
    return (
      <View style={[styles.container]}>
       {/* <ScrollView contentContainerStyle={{ flexGrow: 1 }}> */}
       {/* <View style={{alignItems: 'center', justifyContent: 'center', paddingTop: 50}}> */}
       <RNCamera
          ref={ref => {
            this.camera = ref;
          }}
          captureAudio={false}
          style={styles.preview}
          type={RNCamera.Constants.Type.back}
          flashMode={RNCamera.Constants.FlashMode.off}
          androidCameraPermissionOptions={{
            title: 'Permission to use camera',
            message: 'We need your permission to use your camera',
            buttonPositive: 'Ok',
            buttonNegative: 'Cancel',
          }}
        />
        <View style={{ flex: 0, flexDirection: 'row', justifyContent: 'center' }}>
          <TouchableOpacity onPress={this.takePicture.bind(this)} style={styles.capture}>
            <Text style={{ fontSize: 14 }}> SNAP </Text>
          </TouchableOpacity>
        </View>
        {/* {model ?
          <View>
            <View style={{alignItems: 'center'}}>
            {renderButton(mobile)}
            {renderButton(ssd)}
            {renderButton(yolo)}
          </View>
          <TouchableOpacity style={
            [styles.imageContainer, {
              height: imageHeight,
              width: imageWidth,
              borderWidth: source ? 0 : 2
            }]} onPress={this.onSelectImage.bind(this)}>
            {
              source ?
                <Image source={source} style={{
                  height: imageHeight, width: imageWidth
                }} resizeMode="contain" /> :
                <Text style={[styles.text, {position: 'absolute', top: imageHeight /2 - 20}]}>Select Picture</Text>
            }
            <View style={styles.boxes}>
              {this.renderBoxes()}
            </View>
          </TouchableOpacity>
          <View>
              {this.state.model == mobile &&
                this.state.recognitions.map((res, id) => {
                return (
                  <Text key={id} style={{ color: 'red', fontSize: 20, position: "absolute", bottom: - 25 * (1+id) }}>
                    {res["label"] + " : " + (res["confidence"]).toFixed(0)  + "%"}
                  </Text>
                )
              })}
            </View>
          </View>
          :
          <View>
            <Text style={{color: 'black', alignSelf: 'center', padding: 5}}>Select a model: </Text>
            {renderButton(mobile)}
            {renderButton(ssd)}
            {renderButton(yolo)}
          </View>
        } */}
        {/* </View> */}
      {/* </ScrollView> */}
      </View>

    );
  }

  takePicture = async function() {
    if (this.camera) {
      const options = { quality: 0.8, base64: false };
      const data = await this.camera.takePictureAsync(options);
      console.log(data.uri);
      this.launchDetection(data.uri, data.width, data.height)
    }
  };
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    flex: 1,
    backgroundColor: 'black'
  },
  imageContainer: {
    borderColor: blue,
    borderRadius: 5,
    alignItems: "center"
  },
  text: {
    color: blue,
    fontSize: 20
  },
  button: {
    width: 200,
    backgroundColor: blue,
    borderRadius: 10,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10
  },
  buttonText: {
    color: 'white',
    fontSize: 15
  },
  box: {
    position: 'absolute',
    borderColor: blue,
    borderWidth: 2,
  },
  boxes: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
  },
  preview: {
    borderWidth: 5,
    borderColor: 'red',
    backgroundColor: 'red',
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  capture: {
    flex: 0,
    backgroundColor: '#fff',
    borderRadius: 5,
    padding: 15,
    paddingHorizontal: 20,
    alignSelf: 'center',
    margin: 20,
  },
});
