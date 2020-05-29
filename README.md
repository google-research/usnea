# Usnea

## What is Usnea?

Usnea is an authorship tool for the creation of branching stories, dialogs, games, or whatever you decide to make with  it.
It is explained in (pain)full detail in the associated ACL 2020 Publication (link available soon), but as a video is worth 30K words/sec please enjoy the following [[Instructional Video]](https://www.youtube.com/watch?v=O8uRB8RnMw0)

## Setup
   
Usnea is an Appengine webapp and to use it you need to
host it or find a hosted server.  A server contains one unique string
id for every every story and as such is ideal for a small group of people who
can coordinate not overwriting each other's projects.

There are two main steps involved: setting up firebase for saving and loading and hosting the app itself.

#### Setting up Firebase 

Follow the instructions [[here]](https://firebase.google.com/docs/firestore/quickstart) to set up a Firebase Realtime Database.
    
Once you've got your database set up, follow the first instruction [[here]](https://fireship.io/snippets/install-angularfire/)
 to get your firebase credentials, and paste them into src/environments/environments.ts in Usnea.
 
#### Hosting on Appengine 

Follow the instructions [[here]](https://cloud.google.com/appengine/docs/standard/nodejs) to host a nodejs app on Appengine.

## TLDR the paper 

Usnea is an authorship tool for branching turn based interactions that uses Semantic Matching, an Natural Language Processing (NLP) model class that
takes two strings as input and predicts their semantic similarity on a 0-1 scale.  Those familar with Twine will see its
influence immediately, and the simplest explanation of Usnea is that it is Twine + a simple bit of NLP.  

Another way to briefly describe Usnea is
an editor for a directed graph with node and edge metadata, as well as project metadata; the entire purpose is to author and edit
a complex JSON file.

It is designed with the following Dependency Injection features for bespoke extension to new interactions.

* Project metadata is injectable, allowing custom global story variables.
* Node metadata is injectable, allowing e.g. audio/video interactions to be associated with nodes.
* A World State represented by a string to string hashmap that gates graph traversal.
* A preview mode (similar to Twine) that allows live playtesting.
* The NLP model is injectable, allowing the use of custom similarity models (a default impl using the [[Universal Sentence Encoder]](https://github.com/tensorflow/tfjs-models/tree/master/universal-sentence-encoder) is included). 
* Persistence (saving and loading) is injectable, allowing the use of custom databases (a default impl using Firebase is included). 
 
   
