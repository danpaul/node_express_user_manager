// var jsmo = require('jsmo')

// module.exports = function(templateData){

//     var form = {
//         'form': [
//             { class: 'outer-class' },
//             [
//                 // {head: [{}, headContent]},
//                 {body: [
//                     { id:'body-id', class: ['class-one', 'class-two'] },
//                     // ['test document'],
//                     [{p: [{id: 'first-paragraph'}, 'test paragraph 1']}]
//                     // bodyContent
//                 ]},
//                 {baz: [
//                     'bar', 'bip']},
//                 function(){ return 'foo'; }
//             ]
//         ]
//     }

//     // var testDoc = {
//     //     'html': [
//     //         { class: 'outer-class' },
//     //         [
//     //             // {head: [{}, headContent]},
//     //             {body: [
//     //                 { id:'body-id', class: ['class-one', 'class-two'] },
//     //                 // ['test document'],
//     //                 [{p: [{id: 'first-paragraph'}, 'test paragraph 1']}]
//     //                 // bodyContent
//     //             ]},
//     //             {baz: [
//     //                 'bar', 'bip']},
//     //             function(){ return 'foo'; }
//     //         ]
//     //     ]
//     // }

//     return jsmo.compile(form)
//     // return 'test'
// }